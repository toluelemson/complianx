import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

@Injectable()
export class PdfService {
  async htmlToPdf(html: string, filePath: string) {
    await mkdir(dirname(filePath), { recursive: true });
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
      });
      await writeFile(filePath, buffer);
    } finally {
      await browser.close();
    }
  }
}
