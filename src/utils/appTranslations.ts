// Application Display Language Types and Translations Dictionary
export type AppLanguage = 'marathi' | 'english';

const APP_LANG_KEY = 'anand_app_language';

export const getStoredAppLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'marathi';
  const saved = localStorage.getItem(APP_LANG_KEY);
  if (saved === 'english') {
    return 'english';
  }
  if (saved === 'marathi') {
    return 'marathi';
  }
  // Normalize legacy 'bilingual' or invalid values to 'marathi' and persist
  if (saved) {
    try {
      localStorage.setItem(APP_LANG_KEY, 'marathi');
    } catch {
      // ignore
    }
  }
  return 'marathi'; // Default to Marathi
};

export const setStoredAppLanguage = (lang: AppLanguage) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(APP_LANG_KEY, lang);
    // Also synchronize bill template language so bills match dashboard language selection
    try {
      const billCfgRaw = localStorage.getItem('anand_bill_template_config');
      if (billCfgRaw) {
        const parsed = JSON.parse(billCfgRaw);
        parsed.billLanguage = lang;
        parsed.billTitle = lang === 'marathi' ? 'भाडे पावती व साहित्य चालान' : 'RENTAL BILL & DELIVERY CHALLAN';
        parsed.signatoryTitle = lang === 'marathi' ? 'अधिकृत स्वाक्षरी / शिक्का' : 'Authorized Signatory / Stamp';
        localStorage.setItem('anand_bill_template_config', JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('anand_language_change', { detail: lang }));
  }
};

export const t = {
  marathi: {
    // Navigation items
    nav: {
      Dashboard: 'डॅशबोर्ड',
      Parties: 'ग्राहक',
      'Plate Types': 'प्लेट प्रकार',
      'Plate Stock': 'उपलब्ध स्टॉक',
      Rentals: 'भाडे वाटप नोंदी',
      Returns: 'साहित्य जमा नोंदी',
      Payments: 'जमा पेमेंट्स',
      'Outstanding Dues': 'बाकी रक्कम',
      Ledger: 'खातेवही',
      Notifications: 'सूचना',
      Reports: 'हिशोब अहवाल',
      Settings: 'प्रणाली सेटिंग्ज',
    },
    // Top Bar
    header: {
      controls: 'नियंत्रण',
      subtitle: 'आनंद बिल्डर्स प्रशासकीय प्रणाली',
      searchPlaceholder: 'शोधा...',
      adminUser: 'आनंद ॲडमिन',
      adminRole: 'व्यवस्थापक',
      logout: 'लॉगआउट',
    },
    // Language Section on Dashboard
    langSection: {
      title: 'प्रणाली भाषा',
      subtitle: 'डॅशबोर्ड व संपूर्ण प्रणालीची भाषा निवडा',
      marathiBtn: 'मराठी',
      englishBtn: 'English',
      activeBadge: 'सक्रिय भाषा',
    },
    // Upper Stat Widgets
    stats: {
      totalStock: 'एकूण सेंट्रिंग स्टॉक',
      totalStockSub: 'सर्व मापांचे एकूण उपलब्ध साहित्य',
      inYard: 'गोदामात शिल्लक',
      inYardSub: 'नवीन वाटपासाठी उपलब्ध',
      withParties: 'ग्राहकांकडे भाड्याने',
      withPartiesSub: 'सध्या चालू बांधकाम साइट्सवर',
      outstanding: 'एकूण येणे बाकी',
      outstandingSub: 'ग्राहकांकडील एकूण बाकी रक्कम',
    },
    // Account Balances
    accounts: {
      acc1Title: 'खाते १ (मुख्य बँक)',
      acc1Sub: 'मुख्य बँक खाते जमा',
      acc2Title: 'खाते २ (डिजिटल)',
      acc2Sub: 'दुय्यम डिजिटल खाते जमा',
      cashTitle: 'रोख रक्कम',
      cashSub: 'हातशिल्लक रोख रक्कम',
    },
    // Daily flows
    daily: {
      todayRentals: 'आजचे भाडे वाटप',
      todayRentalsSub: 'आज दिलेल्या नवीन भाडे नोंदी',
      todayReturns: 'आजचे साहित्य जमा',
      todayReturnsSub: 'आज परत आलेले साहित्य',
      overdueRentals: 'मुदत संपलेले साहित्य',
      overdueRentalsSub: 'मुदत संपलेल्या सर्व नोंदी',
    },
    // भाडे मुदत समाप्ती इशारे (Rental cycle expiration alerts across all durations)
    cycleAlerts: {
      title: 'सर्व भाडे मुदत समाप्ती इशारे',
      subtitle: 'मुदत संपलेल्या व लवकरच संपणाऱ्या सर्व नोंदींचे रिअल-टाइम ट्रॅकिंग व थेट संपर्क',
      attentionRequired: 'लक्ष देणे आवश्यक',
      allGoodTitle: 'सर्व भाडे नोंदी नियमित मुदतीत आहेत',
      allGoodSub: 'कोणतीही भाडे नोंद सध्या थकबाकी किंवा ७ दिवसांत संपणारी नाही.',
      plateAndQty: 'साहित्य व नग:',
      activeCycle: 'भाडे सायकल:',
      daysUsed: 'वापरलेले दिवस:',
      termDates: 'मुदत कालावधी:',
      actionStatus: 'कारवाई स्थिती:',
      readyAction: 'जमा किंवा नूतनीकरणासाठी तयार',
      extraCharges: 'अतिरिक्त दिवस आकार:',
      currentPending: 'सध्याची बाकी:',
      callParty: 'फोन करा',
      whatsapp: 'व्हॉट्सॲप',
      renewCycle: 'मुदत वाढवा',
      returnIntake: 'साहित्य जमा',
      cycle: 'सायकल',
      days: 'दिवस',
    },
    // Tables & Lists
    tables: {
      activeRentalsTitle: 'सक्रिय भाडे नोंदी व थकबाकी',
      overdueCount: 'मुदत संपलेले',
      partyCol: 'ग्राहक नाव',
      sizeCol: 'माप',
      qtyCol: 'नग',
      issueDateCol: 'नोंद दिनांक',
      statusCol: 'स्थिती',
      overdueStatus: 'मुदत संपली',
      activeStatus: 'सक्रिय',
      noRentals: 'कोणतीही भाडे नोंद आढळली नाही.',
      stockAllocation: 'स्टॉक वाटप आलेख',
      rentedRatio: 'भाड्याने दिले',
      withPartiesLegend: 'ग्राहकांकडे',
      inStockyardLegend: 'गोदामात शिल्लक',
      recentPayments: 'अलीकडील जमा पेमेंट्स',
      viewAll: 'सर्व पाहा',
      noPayments: 'कोणतेही पेमेंट आढळले नाही.',
      quickActions: 'जलद कृती',
      issueShuttering: 'साहित्य भाड्याने देणे',
      newRentalBtn: '+ नवीन भाडे नोंद',
      receiveShuttering: 'साहित्य परत जमा घेणे',
      addReturnBtn: '+ साहित्य जमा',
      recordPayments: 'पेमेंट पावती नोंदवणे',
      addPaymentBtn: '+ पेमेंट जमा',
      manageStock: 'स्टॉक व्यवस्थापन',
      plateStockBtn: 'प्लेट स्टॉक पाहा',
    },
    // Statement Reports
    reports: {
      compileTitle: 'अहवाल तयार करा',
      printLayout: 'प्रिंट मांडणी:',
      portrait: 'उभा',
      landscape: 'आडवा',
      reportType: 'अहवाल प्रकार',
      customerParty: 'ग्राहक',
      plateSize: 'प्लेट साईझ',
      fromDate: 'दिनांक पासून',
      toDate: 'दिनांक पर्यंत',
      allParties: 'सर्व ग्राहक',
      allSizes: 'सर्व मापे',
      types: {
        all: 'सर्व अहवाल',
        bill_history: 'बिल निहाय इतिहास',
        rental: 'भाडे पावती अहवाल',
        return: 'साहित्य जमा अहवाल',
        payment: 'पेमेंट अहवाल',
        outstanding: 'बाकी रक्कम अहवाल',
      },
      totalRecords: 'एकूण नोंदी:',
      paperSize: 'कागद साईझ:',
      reset: 'रीसेट',
      exportCsv: 'सीएसव्ही डाउनलोड',
      printReport: 'अहवाल प्रिंट करा',
      previewHeading: 'पूर्वावलोकन',
      recordsFound: 'नोंदी आढळल्या',
      selectedCustomer: 'ग्राहक:',
      totalSummary: 'एकूण गोषवारा',
      emptyRecords: 'कोणतीही नोंद आढळली नाही.',
      masterSummary: 'सर्वंकष हिशोब गोषवारा',
      sectionRentals: '१. भाडे पावती अहवाल',
      sectionReturns: '२. साहित्य जमा अहवाल',
      sectionPayments: '३. पेमेंट अहवाल',
      sectionOutstanding: '४. बाकी रक्कम अहवाल',
      totalBilled: 'एकूण भाडे बिल',
      totalPaid: 'एकूण जमा रक्कम',
      netDue: 'एकूण येणे बाकी',
      totalDispatchedPlates: 'एकूण वाटप प्लेट्स',
      totalReturnedPlates: 'एकूण जमा प्लेट्स',
      activePlatesWithParties: 'ग्राहकांकडे शिल्लक प्लेट्स',
      headers: {
        srNo: 'अ.क्र.',
        issueDate: 'नोंद दिनांक',
        returnDate: 'जमा दिनांक',
        paymentDate: 'पेमेंट दिनांक',
        partyName: 'ग्राहकाचे नाव',
        mobile: 'मोबाईल नंबर',
        plateSize: 'प्लेट साईझ',
        quantity: 'नग',
        returnedQty: 'जमा नग',
        remainingQty: 'शिल्लक नग',
        totalRent: 'एकूण भाडे',
        paidAmount: 'जमा रक्कम',
        pendingAmount: 'बाकी रक्कम',
        paymentMode: 'पेमेंट प्रकार',
        reference: 'संदर्भ / तपशील',
      },
    },
  },

  english: {
    // Navigation items
    nav: {
      Dashboard: 'Dashboard',
      Parties: 'Customers',
      'Plate Types': 'Plate Types',
      'Plate Stock': 'Plate Stock',
      Rentals: 'Rental Dispatches',
      Returns: 'Return Intakes',
      Payments: 'Payments',
      'Outstanding Dues': 'Outstanding Dues',
      Ledger: 'Account Ledger',
      Notifications: 'Notifications',
      Reports: 'Statement Reports',
      Settings: 'System Settings',
    },
    // Top Bar
    header: {
      controls: 'Controls',
      subtitle: 'Anand Builders Administrative Console',
      searchPlaceholder: 'Search anything...',
      adminUser: 'Anand Admin',
      adminRole: 'Lead Manager',
      logout: 'Logout',
    },
    // Language Section on Dashboard
    langSection: {
      title: 'System Language',
      subtitle: 'Select display language for dashboard and entire system',
      marathiBtn: 'Marathi',
      englishBtn: 'English',
      activeBadge: 'Active Language',
    },
    // Upper Stat Widgets
    stats: {
      totalStock: 'Total Shuttering Stock',
      totalStockSub: 'Inventory across all plate sizes',
      inYard: 'Available in Yard',
      inYardSub: 'Ready for new dispatch',
      withParties: 'Plates with Parties',
      withPartiesSub: 'Active on construction sites',
      outstanding: 'Total Outstanding Dues',
      outstandingSub: 'Pending accounts receivable',
    },
    // Account Balances
    accounts: {
      acc1Title: 'Account 1 (Bank Direct)',
      acc1Sub: 'Primary bank collections',
      acc2Title: 'Account 2 (UPI / Digital)',
      acc2Sub: 'Secondary digital collections',
      cashTitle: 'Cash',
      cashSub: 'Physical cash on hand',
    },
    // Daily flows
    daily: {
      todayRentals: "Today's Rentals",
      todayRentalsSub: 'Dispatches issued today',
      todayReturns: "Today's Returns",
      todayReturnsSub: 'Intakes received today',
      overdueRentals: 'Overdue Rentals',
      overdueRentalsSub: 'Agreements past agreed rental term',
    },
    // Rental cycle expiration alerts across all durations
    cycleAlerts: {
      title: 'Rental Expiration & Overdue Alerts',
      subtitle: 'Real-time tracking of expired and upcoming term completions with instant Call and WhatsApp actions',
      attentionRequired: 'Attention Required',
      allGoodTitle: 'All Rentals Within Normal Terms',
      allGoodSub: 'No active rental agreements are currently overdue or expiring within 7 days.',
      plateAndQty: 'Plates & Qty:',
      activeCycle: 'Active Cycle:',
      daysUsed: 'Days Used:',
      termDates: 'Term Dates:',
      actionStatus: 'Action Status:',
      readyAction: 'Ready for Return or Renewal',
      extraCharges: 'Extra Charges Added:',
      currentPending: 'Current Pending:',
      callParty: 'Call Party',
      whatsapp: 'WhatsApp',
      renewCycle: 'Renew Cycle',
      returnIntake: 'Return Intake',
      cycle: 'Cycle',
      days: 'Days',
    },
    // Tables & Lists
    tables: {
      activeRentalsTitle: 'Active Rentals & Overdues',
      overdueCount: 'Overdue',
      partyCol: 'Party Name',
      sizeCol: 'Size',
      qtyCol: 'Qty',
      issueDateCol: 'Issue Date',
      statusCol: 'Status',
      overdueStatus: 'Overdue',
      activeStatus: 'Active',
      noRentals: 'No rentals yet.',
      stockAllocation: 'Inventory Stock Allocation',
      rentedRatio: 'rented',
      withPartiesLegend: 'With Parties',
      inStockyardLegend: 'Available in Stockyard',
      recentPayments: 'Recent Payments',
      viewAll: 'View All',
      noPayments: 'No payments yet.',
      quickActions: 'Quick Actions',
      issueShuttering: 'Issue Shuttering',
      newRentalBtn: '+ New Rental',
      receiveShuttering: 'Receive Shuttering',
      addReturnBtn: '+ Add Return',
      recordPayments: 'Record Payments',
      addPaymentBtn: '+ Add Payment',
      manageStock: 'Manage Stock',
      plateStockBtn: 'Plate Stock',
    },
    // Statement Reports
    reports: {
      compileTitle: 'Compile Statement Report',
      printLayout: 'A4 Print:',
      portrait: 'Portrait',
      landscape: 'Landscape',
      reportType: 'Report Type',
      customerParty: 'Customer Party',
      plateSize: 'Plate Size',
      fromDate: 'From Date',
      toDate: 'To Date',
      allParties: 'All Customer Parties',
      allSizes: 'All Sizes',
      types: {
        all: 'All Reports',
        bill_history: 'Bill-Wise History',
        rental: 'Rental Dispatches',
        return: 'Return Intakes',
        payment: 'Payments',
        outstanding: 'Outstanding Dues',
      },
      totalRecords: 'Total Records:',
      paperSize: 'Paper Size:',
      reset: 'Reset',
      exportCsv: 'Export CSV',
      printReport: 'A4 Print Report',
      previewHeading: 'Preview',
      recordsFound: 'records found',
      selectedCustomer: 'Customer:',
      totalSummary: 'Total Summary',
      emptyRecords: 'No records found matching filters.',
      masterSummary: 'Master Statement Summary',
      sectionRentals: '1. Rental Dispatches Report',
      sectionReturns: '2. Return Intakes Report',
      sectionPayments: '3. Payments Report',
      sectionOutstanding: '4. Outstanding Dues Report',
      totalBilled: 'Total Billed Rent',
      totalPaid: 'Total Payments Received',
      netDue: 'Net Outstanding Balance',
      totalDispatchedPlates: 'Total Dispatched Plates',
      totalReturnedPlates: 'Total Returned Plates',
      activePlatesWithParties: 'Active Plates with Parties',
      headers: {
        srNo: 'Sr No',
        issueDate: 'Issue Date',
        returnDate: 'Return Date',
        paymentDate: 'Payment Date',
        partyName: 'Customer Name',
        mobile: 'Mobile Number',
        plateSize: 'Plate Size',
        quantity: 'Quantity',
        returnedQty: 'Returned Qty',
        remainingQty: 'Remaining Qty',
        totalRent: 'Total Rent',
        paidAmount: 'Paid Amount',
        pendingAmount: 'Balance Due',
        paymentMode: 'Payment Mode',
        reference: 'Reference / Notes',
      },
    },
  },
};
