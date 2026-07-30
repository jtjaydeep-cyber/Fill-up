<script>
  // 1. Correct Supabase Client Initialization
  const SUPABASE_URL = 'https://eocxrlmidikrxfpghzwl.supabase.co';
  
  // REPLACE THIS WITH YOUR EXACT ANON / PUBLISHABLE KEY FROM SUPABASE DASHBOARD:
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY3hybG1pZGlrcnhmcGdoendsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODkxOTIsImV4cCI6MjEwMDk2NTE5Mn0.a5lkA3HIsd1Mh7pEJljoL1UN_jk7HE_ddcQ4wSvpiKs';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let currentUserId = null;

  // Load user session on startup & update UI balance
  window.addEventListener('load', async () => {
    checkUserSession();
  });

  async function checkUserSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.innerText = user.email;
        
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
          authBtn.innerText = "Logout";
          authBtn.onclick = handleLogout;
          authBtn.removeAttribute('data-bs-toggle');
        }
        
        fetchCreditBalance(user.id);
      } else {
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.innerText = "Not Logged In";
        document.getElementById('creditDisplay').innerText = "Credits: 0";
      }
    } catch (e) {
      console.error("Session Check Error:", e);
    }
  }

  // Handle Log In & Sign Up
  async function handleAuth(type) {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    try {
      let res;
      if (type === 'signup') {
        res = await supabase.auth.signUp({ email, password });
      } else {
        res = await supabase.auth.signInWithPassword({ email, password });
      }

      if (res.error) {
        alert("Authentication Error: " + res.error.message);
        console.error(res.error);
      } else if (type === 'signup' && !res.data.session) {
        alert("Sign-up successful! Please check your email inbox to confirm your account before logging in.");
      } else {
        alert("Success!");
        location.reload();
      }
    } catch (err) {
      alert("An error occurred: " + err.message);
      console.error(err);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    location.reload();
  }

  async function fetchCreditBalance(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (data) {
      document.getElementById('creditDisplay').innerText = `Credits: ${data.credits_balance}`;
    }
  }

  // Main PDF Generation & Credit Transaction
  async function processVehicleTransfer() {
    if (!currentUserId) {
      const modalElement = document.getElementById('authModal');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      } else {
        alert("Please log in first.");
      }
      return;
    }

    const formData = {
      regNo: document.getElementById('regNo').value.toUpperCase(),
      makeModel: document.getElementById('makeModel').value,
      chassisNo: document.getElementById('chassisNo').value,
      engineNo: document.getElementById('engineNo').value,
      sellerName: document.getElementById('sellerName').value,
      sellerAddress: document.getElementById('sellerAddress').value,
      sellerRTO: document.getElementById('sellerRTO').value,
      buyerName: document.getElementById('buyerName').value,
      buyerAddress: document.getElementById('buyerAddress').value,
      buyerRTO: document.getElementById('buyerRTO').value,
    };

    if (!formData.regNo || !formData.sellerName || !formData.buyerName) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      const newBalance = await executeCreditCheckAndDeduct(currentUserId, 1, 'PARIVAHAN_FORM_29_30', formData);
      document.getElementById('creditDisplay').innerText = `Credits: ${newBalance}`;
      await generateForm29And30PDF(formData);
      alert("Forms generated successfully! 1 Credit deducted.");
    } catch (err) {
      alert("Transaction Error: " + err.message);
    }
  }

  async function executeCreditCheckAndDeduct(userId, cost, serviceCode, payload) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error("Unable to retrieve user balance.");
    }

    if (profile.credits_balance < cost) {
      throw new Error(`Insufficient credits! Available: ${profile.credits_balance}, Required: ${cost}`);
    }

    const updatedCredits = profile.credits_balance - cost;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_balance: updatedCredits })
      .eq('id', userId);

    if (updateError) {
      throw new Error("Failed to deduct credits.");
    }

    await supabase.from('service_logs').insert({
      user_id: userId,
      service_code: serviceCode,
      credits_used: cost,
      form_payload: payload
    });

    return updatedCredits;
  }

  async function generateForm29And30PDF(data) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Page 1: Form 29
    const page1 = pdfDoc.addPage([595, 842]);
    page1.drawText('FORM 29', { x: 260, y: 800, size: 16, font: fontBold });
    page1.drawText('[See Rule 55(1)]', { x: 250, y: 785, size: 10, font: fontRegular });
    page1.drawText('NOTICE OF TRANSFER OF OWNERSHIP OF A MOTOR VEHICLE', { x: 110, y: 765, size: 11, font: fontBold, color: rgb(0, 0.3, 0.6) });

    let y = 720;
    page1.drawText(`To: The Registering Authority, ${data.sellerRTO}`, { x: 50, y, size: 10, font: fontBold });
    y -= 25;
    page1.drawText(`I, ${data.sellerName}, residing at ${data.sellerAddress},`, { x: 50, y, size: 10, font: fontRegular });
    y -= 15;
    page1.drawText(`hereby give notice that I have transferred ownership of motor vehicle No. ${data.regNo}`, { x: 50, y, size: 10, font: fontRegular });
    y -= 15;
    page1.drawText(`Make/Model: ${data.makeModel} | Chassis No: ${data.chassisNo} | Engine No: ${data.engineNo}`, { x: 50, y, size: 9, font: fontRegular });
    y -= 25;
    page1.drawText(`To Shri/Smt: ${data.buyerName}`, { x: 50, y, size: 10, font: fontBold });
    y -= 15;
    page1.drawText(`Residing at: ${data.buyerAddress}`, { x: 50, y, size: 10, font: fontRegular });
    y -= 50;
    page1.drawText('Signature of Transferor (Seller): _______________________', { x: 50, y, size: 9, font: fontBold });

    // Page 2: Form 30
    const page2 = pdfDoc.addPage([595, 842]);
    page2.drawText('FORM 30', { x: 260, y: 800, size: 16, font: fontBold });
    page2.drawText('[See Rule 55(2)]', { x: 250, y: 785, size: 10, font: fontRegular });
    page2.drawText('APPLICATION FOR INTIMATION AND TRANSFER OF OWNERSHIP', { x: 100, y: 765, size: 11, font: fontBold, color: rgb(0, 0.3, 0.6) });

    y = 720;
    page2.drawText(`To: The Registering Authority, ${data.buyerRTO}`, { x: 50, y, size: 10, font: fontBold });
    y -= 25;
    page2.drawText(`I, ${data.buyerName}, residing at ${data.buyerAddress},`, { x: 50, y, size: 10, font: fontRegular });
    y -= 15;
    page2.drawText(`hereby declare that I have acquired vehicle registration No. ${data.regNo} from ${data.sellerName}.`, { x: 50, y, size: 10, font: fontRegular });
    y -= 50;
    page2.drawText('Signature of Transferee (Buyer): _______________________', { x: 50, y, size: 9, font: fontBold });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Form_29_30_${data.regNo}.pdf`;
    link.click();
  }
</script>
