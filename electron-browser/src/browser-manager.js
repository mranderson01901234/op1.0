const puppeteer = require('puppeteer');
const path = require('path');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.activePage = null;
  }

  async initialize() {
    try {
      // Launch headless Chrome
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      });

      console.log('[Browser] Headless Chrome initialized');
      return true;
    } catch (error) {
      console.error('[Browser] Failed to initialize:', error);
      return false;
    }
  }

  async navigate(url) {
    try {
      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      // Close previous page if exists
      if (this.activePage) {
        await this.activePage.close();
      }

      // Create new page
      this.activePage = await this.browser.newPage();

      // Set timeout
      this.activePage.setDefaultTimeout(30000);

      // Navigate
      await this.activePage.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      const title = await this.activePage.title();
      const finalUrl = this.activePage.url();

      console.log(`[Browser] Navigated to: ${finalUrl}`);

      return {
        success: true,
        url: finalUrl,
        title
      };
    } catch (error) {
      console.error('[Browser] Navigation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getContent() {
    try {
      if (!this.activePage) {
        throw new Error('No active page');
      }

      const html = await this.activePage.content();
      const text = await this.activePage.evaluate(() => document.body.innerText);
      const url = this.activePage.url();

      return {
        success: true,
        html,
        text,
        url
      };
    } catch (error) {
      console.error('[Browser] Get content error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async screenshot() {
    try {
      if (!this.activePage) {
        throw new Error('No active page');
      }

      const screenshot = await this.activePage.screenshot({
        encoding: 'base64',
        type: 'png',
        fullPage: false
      });

      console.log('[Browser] Screenshot captured');

      return {
        success: true,
        screenshot
      };
    } catch (error) {
      console.error('[Browser] Screenshot error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeScript(script) {
    try {
      if (!this.activePage) {
        throw new Error('No active page');
      }

      const result = await this.activePage.evaluate((code) => {
        return eval(code);
      }, script);

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('[Browser] Script execution error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async closePage() {
    try {
      if (this.activePage) {
        await this.activePage.close();
        this.activePage = null;
        console.log('[Browser] Page closed');
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('[Browser] Close page error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanup() {
    try {
      if (this.activePage) {
        await this.activePage.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('[Browser] Cleanup complete');
    } catch (error) {
      console.error('[Browser] Cleanup error:', error);
    }
  }
}

module.exports = BrowserManager;
