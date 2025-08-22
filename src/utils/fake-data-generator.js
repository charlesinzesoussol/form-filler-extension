class FakeDataGenerator {
  constructor() {
    // Sample data arrays for generating realistic fake data
    this.firstNames = [
      'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher',
      'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
      'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
      'Nancy', 'Lisa', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle'
    ];

    this.lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
      'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
      'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
    ];

    this.companies = [
      'TechCorp', 'Innovate Inc', 'Global Solutions', 'Digital Dynamics', 'Future Systems', 'Smart Technologies',
      'NextGen Solutions', 'Advanced Analytics', 'CloudFirst', 'DataFlow Corp', 'Velocity Ventures', 'Quantum Labs',
      'Precision Software', 'Infinity Systems', 'Apex Innovations', 'Prime Technologies', 'Elite Enterprises',
      'Summit Solutions', 'Paramount Partners', 'Vanguard Ventures'
    ];

    this.domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'company.com', 'example.org'];

    this.cities = [
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
      'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco',
      'Indianapolis', 'Seattle', 'Denver', 'Washington', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City'
    ];

    this.states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
      'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
      'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    this.countries = [
      'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Australia',
      'Japan', 'South Korea', 'Brazil', 'Mexico', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
    ];

    this.loremWords = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod',
      'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim',
      'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea',
      'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse',
      'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident'
    ];
  }

  // Utility methods
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomFloat(min, max, decimals = 2) {
    return (Math.random() * (max - min) + min).toFixed(decimals);
  }

  // Name generators
  generateFirstName() {
    return this.randomChoice(this.firstNames);
  }

  generateLastName() {
    return this.randomChoice(this.lastNames);
  }

  generateFullName() {
    return `${this.generateFirstName()} ${this.generateLastName()}`;
  }

  generateUsername() {
    const firstName = this.generateFirstName().toLowerCase();
    const lastName = this.generateLastName().toLowerCase();
    const number = this.randomInt(1, 999);
    const formats = [
      `${firstName}${lastName}`,
      `${firstName}.${lastName}`,
      `${firstName}_${lastName}`,
      `${firstName}${number}`,
      `${firstName}.${lastName}${number}`
    ];
    return this.randomChoice(formats);
  }

  // Email generators
  generateEmail() {
    const username = this.generateUsername();
    const domain = this.randomChoice(this.domains);
    return `${username}@${domain}`;
  }

  generateCompanyEmail() {
    const firstName = this.generateFirstName().toLowerCase();
    const lastName = this.generateLastName().toLowerCase();
    const company = this.randomChoice(this.companies).toLowerCase().replace(/\s+/g, '');
    return `${firstName}.${lastName}@${company}.com`;
  }

  // Phone generators
  generatePhoneNumber() {
    const formats = [
      '(XXX) XXX-XXXX',
      'XXX-XXX-XXXX',
      'XXX.XXX.XXXX',
      '+1 XXX XXX XXXX'
    ];
    const format = this.randomChoice(formats);
    return format.replace(/X/g, () => this.randomInt(0, 9));
  }

  // Address generators
  generateStreetAddress() {
    const streetNumber = this.randomInt(1, 9999);
    const streetNames = [
      'Main St', 'Oak Ave', 'Elm St', 'Park Ave', 'Maple Dr', 'Cedar Ln', 'Pine St', 'First Ave',
      'Second St', 'Third Ave', 'Broadway', 'Church St', 'High St', 'School St', 'Spring St'
    ];
    return `${streetNumber} ${this.randomChoice(streetNames)}`;
  }

  generateCity() {
    return this.randomChoice(this.cities);
  }

  generateState() {
    return this.randomChoice(this.states);
  }

  generateZipCode() {
    return this.randomInt(10000, 99999).toString();
  }

  generateCountry() {
    return this.randomChoice(this.countries);
  }

  generateFullAddress() {
    return `${this.generateStreetAddress()}, ${this.generateCity()}, ${this.generateState()} ${this.generateZipCode()}`;
  }

  // Company generators
  generateCompanyName() {
    return this.randomChoice(this.companies);
  }

  generateJobTitle() {
    const titles = [
      'Software Engineer', 'Product Manager', 'Designer', 'Marketing Manager', 'Sales Representative',
      'Data Analyst', 'Project Manager', 'Business Analyst', 'Customer Success Manager', 'Developer',
      'Senior Developer', 'Team Lead', 'Director', 'Vice President', 'Manager', 'Specialist',
      'Coordinator', 'Assistant', 'Executive', 'Consultant'
    ];
    return this.randomChoice(titles);
  }

  // Number generators
  generateAge() {
    return this.randomInt(18, 80);
  }

  generateSalary() {
    return this.randomInt(30000, 150000);
  }

  generatePrice() {
    return this.randomFloat(1, 1000);
  }

  generateQuantity() {
    return this.randomInt(1, 100);
  }

  // Date generators
  generateDate() {
    const start = new Date(1950, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  generateBirthDate() {
    const start = new Date(1940, 0, 1);
    const end = new Date(2005, 11, 31);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  generateTime() {
    const hours = String(this.randomInt(0, 23)).padStart(2, '0');
    const minutes = String(this.randomInt(0, 59)).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Text generators
  generateLoremWords(wordCount = 5) {
    const words = [];
    for (let i = 0; i < wordCount; i++) {
      words.push(this.randomChoice(this.loremWords));
    }
    return words.join(' ');
  }

  generateLoremSentence() {
    const wordCount = this.randomInt(8, 15);
    const sentence = this.generateLoremWords(wordCount);
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
  }

  generateLoremParagraph() {
    const sentenceCount = this.randomInt(3, 6);
    const sentences = [];
    for (let i = 0; i < sentenceCount; i++) {
      sentences.push(this.generateLoremSentence());
    }
    return sentences.join(' ');
  }

  // URL generators
  generateUrl() {
    const protocols = ['https://'];
    const subdomains = ['www.', ''];
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
    const paths = ['', '/page', '/about', '/contact', '/products', '/services'];
    
    return `${this.randomChoice(protocols)}${this.randomChoice(subdomains)}${this.randomChoice(domains)}${this.randomChoice(paths)}`;
  }

  // Color generators
  generateColor() {
    const colors = [
      '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
      '#800000', '#008000', '#000080', '#808000', '#800080', '#008080',
      '#C0C0C0', '#808080', '#9999FF', '#993366', '#FFFFCC', '#CCFFFF'
    ];
    return this.randomChoice(colors);
  }

  generateHexColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  // Credit card generators (for testing only)
  generateCreditCardNumber() {
    // Generate fake credit card number (Luhn algorithm compliant)
    const prefixes = ['4', '51', '52', '53', '54', '55']; // Visa, MasterCard
    const prefix = this.randomChoice(prefixes);
    let number = prefix;
    
    // Generate remaining digits
    while (number.length < 15) {
      number += this.randomInt(0, 9);
    }
    
    // Calculate check digit using Luhn algorithm
    let sum = 0;
    let alternate = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let n = parseInt(number.charAt(i));
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      sum += n;
      alternate = !alternate;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return number + checkDigit;
  }

  generateCVV() {
    return String(this.randomInt(100, 999));
  }

  // Social security number (for testing only)
  generateSSN() {
    const area = this.randomInt(100, 999);
    const group = this.randomInt(10, 99);
    const serial = this.randomInt(1000, 9999);
    return `${area}-${group}-${serial}`;
  }

  // Password generator
  generatePassword(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // UUID generator
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Boolean generator
  generateBoolean() {
    return Math.random() > 0.5;
  }

  // IP Address generator
  generateIPAddress() {
    return `${this.randomInt(1, 255)}.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}.${this.randomInt(1, 255)}`;
  }

  // Generate data based on field context
  generateByFieldType(fieldType, fieldName = '', placeholder = '') {
    const lowerName = fieldName.toLowerCase();
    const lowerPlaceholder = placeholder.toLowerCase();
    
    // Email detection
    if (fieldType === 'email' || lowerName.includes('email') || lowerPlaceholder.includes('email')) {
      return this.generateEmail();
    }
    
    // Phone detection
    if (lowerName.includes('phone') || lowerName.includes('tel') || lowerPlaceholder.includes('phone')) {
      return this.generatePhoneNumber();
    }
    
    // Name detection
    if (lowerName.includes('first') && lowerName.includes('name')) {
      return this.generateFirstName();
    }
    if (lowerName.includes('last') && lowerName.includes('name')) {
      return this.generateLastName();
    }
    if (lowerName.includes('name') || lowerName.includes('fullname')) {
      return this.generateFullName();
    }
    
    // Address detection
    if (lowerName.includes('address') || lowerName.includes('street')) {
      return this.generateStreetAddress();
    }
    if (lowerName.includes('city')) {
      return this.generateCity();
    }
    if (lowerName.includes('state') || lowerName.includes('province')) {
      return this.generateState();
    }
    if (lowerName.includes('zip') || lowerName.includes('postal')) {
      return this.generateZipCode();
    }
    if (lowerName.includes('country')) {
      return this.generateCountry();
    }
    
    // Company detection
    if (lowerName.includes('company') || lowerName.includes('organization')) {
      return this.generateCompanyName();
    }
    if (lowerName.includes('job') || lowerName.includes('title') || lowerName.includes('position')) {
      return this.generateJobTitle();
    }
    
    // Date detection
    if (fieldType === 'date' || lowerName.includes('date') || lowerName.includes('birth')) {
      return this.generateDate();
    }
    if (fieldType === 'time' || lowerName.includes('time')) {
      return this.generateTime();
    }
    
    // Number detection
    if (fieldType === 'number' || lowerName.includes('age')) {
      if (lowerName.includes('age')) return this.generateAge();
      if (lowerName.includes('price') || lowerName.includes('cost')) return this.generatePrice();
      if (lowerName.includes('quantity') || lowerName.includes('amount')) return this.generateQuantity();
      return this.randomInt(1, 1000);
    }
    
    // URL detection
    if (fieldType === 'url' || lowerName.includes('url') || lowerName.includes('website')) {
      return this.generateUrl();
    }
    
    // Password detection
    if (fieldType === 'password' || lowerName.includes('password') || lowerName.includes('pass')) {
      return this.generatePassword();
    }
    
    // Color detection
    if (fieldType === 'color' || lowerName.includes('color') || lowerName.includes('colour')) {
      return this.generateHexColor();
    }
    
    // Default text generation
    if (fieldType === 'textarea' || lowerName.includes('message') || lowerName.includes('description') || lowerName.includes('comment')) {
      return this.generateLoremParagraph();
    }
    
    // Default fallback
    return this.generateLoremWords(3);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FakeDataGenerator;
}