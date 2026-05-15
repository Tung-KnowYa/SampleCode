class MockDB {
  constructor(_config) {
    this.mockData = [
      {
        content: "Data protection is a set of strategies and processes you can use to secure the privacy, availability, and integrity of your data. It is also sometimes called data security or information privacy.",
        document_name: "data_protection_basics.txt"
      },
      {
        content: "The General Data Protection Regulation (GDPR) is a legal framework that sets guidelines for the collection and processing of personal information from individuals who live in the European Union (EU).",
        document_name: "gdpr_overview.pdf"
      },
      {
        content: "Phishing is a type of social engineering attack often used to steal user data, including login credentials and credit card numbers.",
        document_name: "security_threats.docx"
      }
    ];
  }

  async query(text, params) {
    console.log('[MockDB] Query:', text.replace(/\s+/g, ' ').trim());
    // Basic mock logic: just return some rows
    return {
      rows: this.mockData.slice(0, params?.[1] || 5)
    };
  }
}

module.exports = MockDB;
