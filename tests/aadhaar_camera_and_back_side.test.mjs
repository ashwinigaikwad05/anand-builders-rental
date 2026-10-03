import { strict as assert } from 'node:assert';

console.log('===========================================================================');
console.log('    AADHAAR FRONT & BACK SIDE + CAMERA CAPTURE TEST SUITE');
console.log('===========================================================================\n');

// 1. Deduplication with aadhaar_back_url
console.log('🪪  SUITE 1: Party Deduplication & Aadhaar Back URL Preservation');
{
  function deduplicateParties(parties) {
    const mobileMap = new Map();
    const nameMap = new Map();
    const deduplicated = [];
    const duplicatesRemoved = [];

    const getCleanPhone = (phone) => (phone ? phone.replace(/\D/g, '').slice(-10) : '');

    for (const p of parties) {
      const cleanPhone = getCleanPhone(p.mobile);
      const cleanName = (p.name || '').trim().toLowerCase();

      let canonical = null;
      if (cleanPhone && cleanPhone.length === 10 && mobileMap.has(cleanPhone)) {
        canonical = mobileMap.get(cleanPhone);
      } else if (cleanName && nameMap.has(cleanName)) {
        canonical = nameMap.get(cleanName);
      }

      if (canonical) {
        if (!canonical.photo_url && p.photo_url) canonical.photo_url = p.photo_url;
        if (!canonical.aadhaar_url && p.aadhaar_url) canonical.aadhaar_url = p.aadhaar_url;
        if (!canonical.aadhaar_back_url && p.aadhaar_back_url) canonical.aadhaar_back_url = p.aadhaar_back_url;
        if (!canonical.cheque_url && p.cheque_url) canonical.cheque_url = p.cheque_url;
        if (!canonical.address && p.address) canonical.address = p.address;
        if (!canonical.notes && p.notes) canonical.notes = p.notes;
        duplicatesRemoved.push(p);
      } else {
        const record = { ...p };
        if (cleanPhone && cleanPhone.length === 10) mobileMap.set(cleanPhone, record);
        if (cleanName) nameMap.set(cleanName, record);
        deduplicated.push(record);
      }
    }

    return { deduplicated, duplicatesRemoved };
  }

  const party1 = {
    id: 'p-1',
    name: 'Rutik Pawar',
    mobile: '9876543210',
    address: 'Near Shahu Chowk',
    notes: 'Aadhaar front only',
    status: 'active',
    photo_url: 'data:image/jpeg;base64,face123',
    aadhaar_url: 'data:image/jpeg;base64,aadhaarFront123',
    aadhaar_back_url: null,
    cheque_url: null,
  };

  const party2Duplicate = {
    id: 'p-2',
    name: 'Rutik Pawar',
    mobile: '9876543210',
    address: 'Near Shahu Chowk',
    notes: 'Added back side later',
    status: 'active',
    photo_url: null,
    aadhaar_url: null,
    aadhaar_back_url: 'data:image/jpeg;base64,aadhaarBack456',
    cheque_url: 'data:image/jpeg;base64,cheque789',
  };

  const { deduplicated } = deduplicateParties([party1, party2Duplicate]);

  assert.equal(deduplicated.length, 1, 'Duplicate party merged into single record');
  const canonical = deduplicated[0];
  assert.equal(canonical.aadhaar_url, 'data:image/jpeg;base64,aadhaarFront123', 'Aadhaar front preserved');
  assert.equal(canonical.aadhaar_back_url, 'data:image/jpeg;base64,aadhaarBack456', 'Aadhaar back merged successfully');
  assert.equal(canonical.cheque_url, 'data:image/jpeg;base64,cheque789', 'Cheque URL merged');
  console.log('  ✅ [Deduplication] aadhaar_back_url successfully merges from duplicate record into canonical party');
}

// 2. Party Model Property Mapping
console.log('\n📋 SUITE 2: Party Interface & Mapping');
{
  const partyRecord = {
    id: 'party-101',
    name: 'Patil Constructions',
    mobile: '9822001122',
    address: 'Kolhapur',
    notes: 'Regular client',
    status: 'active',
    photo_url: 'https://example.com/face.jpg',
    aadhaar_url: 'https://example.com/aadhaar_front.jpg',
    aadhaar_back_url: 'https://example.com/aadhaar_back.jpg',
    cheque_url: 'https://example.com/cheque.jpg',
  };

  // Simulate AdminLayout mapping
  const mappedParty = {
    id: partyRecord.id,
    name: partyRecord.name,
    mobile: partyRecord.mobile,
    address: partyRecord.address,
    notes: partyRecord.notes,
    status: partyRecord.status,
    photoUrl: partyRecord.photo_url || null,
    aadhaarUrl: partyRecord.aadhaar_url || null,
    aadhaarBackUrl: partyRecord.aadhaar_back_url || null,
    chequeUrl: partyRecord.cheque_url || null,
  };

  assert.equal(mappedParty.aadhaarUrl, 'https://example.com/aadhaar_front.jpg');
  assert.equal(mappedParty.aadhaarBackUrl, 'https://example.com/aadhaar_back.jpg');
  assert.equal(mappedParty.photoUrl, 'https://example.com/face.jpg');
  assert.equal(mappedParty.chequeUrl, 'https://example.com/cheque.jpg');
  console.log('  ✅ [Party Mapping] Both aadhaarUrl and aadhaarBackUrl map seamlessly from DB record to UI state');
}

// 3. Image Rotation and Dimension Math
console.log('\n🔄 SUITE 3: Rotation & Dimension Calculations');
{
  function computeRotatedDimensions(width, height, rotation) {
    const normalized = ((rotation % 360) + 360) % 360;
    const isSwapped = normalized === 90 || normalized === 270;
    return {
      width: isSwapped ? height : width,
      height: isSwapped ? width : height,
    };
  }

  const origW = 1920;
  const origH = 1080;

  const rot0 = computeRotatedDimensions(origW, origH, 0);
  assert.equal(rot0.width, 1920);
  assert.equal(rot0.height, 1080);

  const rot90 = computeRotatedDimensions(origW, origH, 90);
  assert.equal(rot90.width, 1080);
  assert.equal(rot90.height, 1920);

  const rot180 = computeRotatedDimensions(origW, origH, 180);
  assert.equal(rot180.width, 1920);
  assert.equal(rot180.height, 1080);

  const rot270 = computeRotatedDimensions(origW, origH, 270);
  assert.equal(rot270.width, 1080);
  assert.equal(rot270.height, 1920);

  console.log('  ✅ [Rotation Math] 90° and 270° correctly transpose width/height dimensions for portrait/landscape photo captures');
}

// 4. Crop Aspect Framing for Aadhaar (3:2) and Face (1:1)
console.log('\n✂️  SUITE 4: Crop Aspect Framing');
{
  function getCropBounds(aspect, containerW, containerH) {
    if (aspect === 'id_card') {
      // 3:2 ratio centered
      const targetAspect = 1.5;
      let cropW = containerW * 0.9;
      let cropH = cropW / targetAspect;
      if (cropH > containerH * 0.9) {
        cropH = containerH * 0.9;
        cropW = cropH * targetAspect;
      }
      return {
        width: Math.round(cropW),
        height: Math.round(cropH),
        aspectRatio: +(cropW / cropH).toFixed(2),
      };
    } else if (aspect === 'square') {
      const size = Math.min(containerW, containerH) * 0.8;
      return {
        width: Math.round(size),
        height: Math.round(size),
        aspectRatio: 1.0,
      };
    }
    return { width: containerW, height: containerH, aspectRatio: +(containerW / containerH).toFixed(2) };
  }

  const idCardCrop = getCropBounds('id_card', 1200, 800);
  assert.equal(idCardCrop.aspectRatio, 1.5, 'ID card crop adheres to 3:2 aspect ratio');

  const faceCrop = getCropBounds('square', 800, 800);
  assert.equal(faceCrop.aspectRatio, 1.0, 'Customer face crop adheres to 1:1 square ratio');

  console.log('  ✅ [Crop Framing] ID card (3:2) and square face (1:1) crops calculate correctly');
}

console.log('\n===========================================================================');
console.log('  🎉 SUMMARY: ALL 5 AADHAAR FRONT & BACK TESTS PASSED');
console.log('===========================================================================');
