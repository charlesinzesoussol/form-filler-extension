class DataTemplateManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.templates = new Map();
    this.activeTemplate = null;
  }

  async init() {
    await this.loadTemplates();
    console.log('Data template manager initialized');
  }

  // Template CRUD operations
  async createTemplate(name, data, isDefault = false) {
    const template = {
      id: this.generateTemplateId(),
      name: name,
      data: this.validateTemplateData(data),
      isDefault: isDefault,
      created: Date.now(),
      modified: Date.now(),
      usageCount: 0
    };

    this.templates.set(template.id, template);
    await this.saveTemplates();

    if (isDefault) {
      await this.setDefaultTemplate(template.id);
    }

    return template;
  }

  async updateTemplate(templateId, updates) {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      modified: Date.now()
    };

    if (updates.data) {
      updatedTemplate.data = this.validateTemplateData(updates.data);
    }

    this.templates.set(templateId, updatedTemplate);
    await this.saveTemplates();

    return updatedTemplate;
  }

  async deleteTemplate(templateId) {
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default template');
    }

    this.templates.delete(templateId);
    await this.saveTemplates();

    return true;
  }

  async getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  async getAllTemplates() {
    return Array.from(this.templates.values());
  }

  async getDefaultTemplate() {
    const templates = Array.from(this.templates.values());
    return templates.find(template => template.isDefault) || null;
  }

  async setDefaultTemplate(templateId) {
    // Remove default flag from all templates
    for (const template of this.templates.values()) {
      template.isDefault = false;
    }

    // Set new default
    const template = this.templates.get(templateId);
    if (template) {
      template.isDefault = true;
      await this.saveTemplates();
    }

    return template;
  }

  // Template usage tracking
  async incrementTemplateUsage(templateId) {
    const template = this.templates.get(templateId);
    
    if (template) {
      template.usageCount++;
      template.lastUsed = Date.now();
      await this.saveTemplates();
    }
  }

  // Pre-defined template creation
  async createPersonalTemplate() {
    const personalData = {
      personal: {
        firstName: '',
        lastName: '',
        fullName: '',
        email: '',
        phone: '',
        dateOfBirth: ''
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      professional: {
        company: '',
        jobTitle: '',
        website: ''
      },
      preferences: {
        fillPasswords: false,
        skipProtectedFields: true,
        showVisualFeedback: true
      }
    };

    return await this.createTemplate('Personal', personalData, true);
  }

  async createBusinessTemplate() {
    const businessData = {
      personal: {
        firstName: '',
        lastName: '',
        fullName: '',
        email: '',
        phone: ''
      },
      business: {
        companyName: '',
        businessEmail: '',
        businessPhone: '',
        jobTitle: '',
        department: '',
        website: '',
        industry: ''
      },
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      businessAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      preferences: {
        fillPasswords: false,
        skipProtectedFields: true,
        showVisualFeedback: true
      }
    };

    return await this.createTemplate('Business', businessData, false);
  }

  async createTestingTemplate() {
    const testData = {
      personal: {
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-0123',
        dateOfBirth: '1990-01-01'
      },
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'United States'
      },
      professional: {
        company: 'Example Corp',
        jobTitle: 'Software Engineer',
        website: 'https://example.com'
      },
      preferences: {
        fillPasswords: false,
        skipProtectedFields: true,
        showVisualFeedback: true
      }
    };

    return await this.createTemplate('Test Data', testData, false);
  }

  // Template validation and transformation
  validateTemplateData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid template data');
    }

    // Ensure required sections exist
    const requiredSections = ['personal', 'preferences'];
    
    requiredSections.forEach(section => {
      if (!data[section]) {
        data[section] = {};
      }
    });

    // Validate preferences
    if (!data.preferences.hasOwnProperty('fillPasswords')) {
      data.preferences.fillPasswords = false;
    }
    
    if (!data.preferences.hasOwnProperty('skipProtectedFields')) {
      data.preferences.skipProtectedFields = true;
    }
    
    if (!data.preferences.hasOwnProperty('showVisualFeedback')) {
      data.preferences.showVisualFeedback = true;
    }

    return data;
  }

  // Template merging for inheritance
  async mergeTemplates(baseTemplateId, overlayTemplateId) {
    const baseTemplate = await this.getTemplate(baseTemplateId);
    const overlayTemplate = await this.getTemplate(overlayTemplateId);

    if (!baseTemplate || !overlayTemplate) {
      throw new Error('Template not found');
    }

    const mergedData = this.deepMerge(baseTemplate.data, overlayTemplate.data);
    
    return {
      data: mergedData,
      basedOn: [baseTemplateId, overlayTemplateId]
    };
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  // Template export/import
  async exportTemplate(templateId) {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    const exportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      template: {
        name: template.name,
        data: template.data
      }
    };

    return {
      data: exportData,
      filename: `template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`
    };
  }

  async importTemplate(importDataString, name = null) {
    try {
      const importData = JSON.parse(importDataString);
      
      if (!importData.template || !importData.template.data) {
        throw new Error('Invalid template format');
      }

      const templateName = name || importData.template.name || 'Imported Template';
      
      return await this.createTemplate(
        templateName,
        importData.template.data,
        false
      );
    } catch (error) {
      throw new Error('Failed to import template: ' + error.message);
    }
  }

  // Template search and filtering
  async searchTemplates(query) {
    const templates = await this.getAllTemplates();
    const lowerQuery = query.toLowerCase();
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      this.searchInTemplateData(template.data, lowerQuery)
    );
  }

  searchInTemplateData(data, query) {
    const searchString = JSON.stringify(data).toLowerCase();
    return searchString.includes(query);
  }

  async getTemplatesByUsage(limit = 5) {
    const templates = await this.getAllTemplates();
    return templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  async getRecentTemplates(limit = 5) {
    const templates = await this.getAllTemplates();
    return templates
      .filter(template => template.lastUsed)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }

  // Template analytics
  async getTemplateStats() {
    const templates = await this.getAllTemplates();
    
    const totalUsage = templates.reduce((sum, template) => sum + template.usageCount, 0);
    const averageUsage = templates.length > 0 ? totalUsage / templates.length : 0;
    
    return {
      totalTemplates: templates.length,
      totalUsage: totalUsage,
      averageUsage: averageUsage,
      mostUsed: templates.reduce((max, template) => 
        template.usageCount > max.usageCount ? template : max, 
        { usageCount: 0 }
      ),
      defaultTemplate: await this.getDefaultTemplate()
    };
  }

  // Active template management
  async setActiveTemplate(templateId) {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    this.activeTemplate = templateId;
    
    // Save active template to storage
    await this.storageManager.updateSetting('activeTemplate', templateId);
    
    return template;
  }

  async getActiveTemplate() {
    if (!this.activeTemplate) {
      const settings = await this.storageManager.getSettings();
      this.activeTemplate = settings.activeTemplate;
    }

    if (this.activeTemplate) {
      return await this.getTemplate(this.activeTemplate);
    }

    // Fall back to default template
    return await this.getDefaultTemplate();
  }

  // Storage operations
  async loadTemplates() {
    try {
      const stored = await this.storageManager.get('templates');
      
      if (stored && Array.isArray(stored)) {
        this.templates.clear();
        stored.forEach(template => {
          this.templates.set(template.id, template);
        });
      } else {
        // Create default template if none exist
        await this.createPersonalTemplate();
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      // Create default template on error
      await this.createPersonalTemplate();
    }
  }

  async saveTemplates() {
    try {
      const templateArray = Array.from(this.templates.values());
      await this.storageManager.set('templates', templateArray);
    } catch (error) {
      console.error('Error saving templates:', error);
      throw new Error('Failed to save templates');
    }
  }

  // Utility methods
  generateTemplateId() {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async duplicateTemplate(templateId, newName = null) {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    const duplicateName = newName || `${template.name} (Copy)`;
    
    return await this.createTemplate(
      duplicateName,
      template.data,
      false
    );
  }

  async resetToDefaults() {
    // Clear all templates
    this.templates.clear();
    
    // Create default templates
    await this.createPersonalTemplate();
    await this.createBusinessTemplate();
    
    return true;
  }

  // Template validation for form filling
  validateTemplateForFilling(template) {
    if (!template || !template.data) {
      return { valid: false, errors: ['Template is empty'] };
    }

    const errors = [];
    
    // Check for required personal data
    if (!template.data.personal) {
      errors.push('Personal information section is missing');
    }

    // Check for preferences
    if (!template.data.preferences) {
      errors.push('Preferences section is missing');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}