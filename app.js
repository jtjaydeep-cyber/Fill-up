// 1. Initialize Supabase
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUserId = null;

// Load user session on startup & update UI balance
window.addEventListener('load', async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUserId = user.id;
    fetchCreditBalance(user.id);
  } else {
    document.getElementById('creditDisplay').innerText = "Not Logged In";
  }
});

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

// 2. Main Transaction Handler
async function processVehicleTransfer() {
  if (!currentUserId) {
    alert("Please log in to your account first.");
    return;
  }

  // Collect inputs
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
    // Step A: Check and Deduct 1 Credit securely
    const newBalance = await executeCreditCheckAndDeduct(currentUserId, 1, 'PARIVAHAN_FORM_29_30', formData);
    
    // Step B: Update UI Badge
    document.getElementById('creditDisplay').innerText = `Credits: ${newBalance}`;

    // Step C: Render and Download the PDF
    await generateForm29And30PDF(formData);

    alert("Forms generated successfully! 1 Credit deducted.");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// 3. Database Credit Guard & Transaction Logger
async function executeCreditCheckAndDeduct(userId, cost, serviceCode, payload) {
  // Check user profile credit balance
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new Error("Unable to retrieve user profile balance.");
  }

  if (profile.credits_balance < cost) {
    throw new Error(`Insufficient credits! Balance: ${profile.credits_balance}, Required: ${cost}`);
  }

  const updatedCredits = profile.credits_balance - cost;

  // Deduct credits in database
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits_balance: updatedCredits })
    .eq('id', userId);

  if (updateError) {
    throw new Error("Failed to deduct credits. Please try again.");
  }

  // Log service execution
  await supabase.from('service_logs').insert({
    user_id: userId,
    service_code: serviceCode,
    credits_used: cost,
    form_payload: payload
  });

  return updatedCredits;
}

// 4. `pdf-lib` Form Generation Engine
async function generateForm29And30PDF(data) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  
  // Page 1: Form 29 (Seller Notice)
  const page1 = pdfDoc.addPage([595, 842]); // A4
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page1.drawText('FORM 29', { x: 260, y: 800, size: 16, font: fontBold });
  page1.drawText('[See Rule 55(1)]', { x: 250, y: 785, size: 10, font: fontRegular });
  page1.drawText('NOTICE OF TRANSFER OF OWNERSHIP OF A MOTOR VEHICLE', { x: 120, y: 765, size: 12, font: fontBold, color: rgb(0, 0.3, 0.6) });

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
  y -= 40;

  page1.drawText('Signature of the Transferor (Seller): _______________________', { x: 50, y, size: 10, font: fontBold });

  // Page 2: Form 30 (Buyer Application)
  const page2 = pdfDoc.addPage([595, 842]);
  page2.drawText('FORM 30', { x: 260, y: 800, size: 16, font: fontBold });
  page2.drawText('[See Rule 55(2)]', { x: 250, y: 785, size: 10, font: fontRegular });
  page2.drawText('APPLICATION FOR INTIMATION AND TRANSFER OF OWNERSHIP', { x: 110, y: 765, size: 12, font: fontBold, color: rgb(0, 0.3, 0.6) });

  y = 720;
  page2.drawText(`To: The Registering Authority, ${data.buyerRTO}`, { x: 50, y, size: 10, font: fontBold });
  y -= 25;

  page2.drawText(`I, ${data.buyerName}, residing at ${data.buyerAddress},`, { x: 50, y, size: 10, font: fontRegular });
  y -= 15;
  page2.drawText(`hereby declare that I have acquired vehicle registration No. ${data.regNo} from ${data.sellerName}.`, { x: 50, y, size: 10, font: fontRegular });
  y -= 40;

  page2.drawText('Signature of the Transferee (Buyer): _______________________', { x: 50, y, size: 10, font: fontBold });

  const pdfBytes = await pdfDoc.save();

  // Initiate mobile browser download
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Form_29_30_${data.regNo}.pdf`;
  link.click();
}
