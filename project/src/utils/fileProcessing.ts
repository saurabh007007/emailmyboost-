import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export async function processTemplate(file: File): Promise<{ subject: string; content: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    if (file.name.endsWith('.docx')) {
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const htmlContent = result.value;
      
      //console.log('DOCX content:', htmlContent);
      
      // Extract subject from first line/heading if it exists
      const subject = extractSubjectFromHtml(htmlContent);
      // const content = removeSubjectFromHtml(htmlContent, subject);
      
     // Remove subject line from content
const tempDiv = document.createElement('div');
tempDiv.innerHTML = htmlContent;



const allElements = tempDiv.querySelectorAll('*');

allElements.forEach((el) => {
  const rawText = el.textContent?.trim() || '';
  const normalizedText = rawText.toLowerCase().replace(/\s+/g, '');

  // Match Subject:- or variants
  if (/^subject[:;,\-–]*$/i.test(normalizedText)) {
    console.log('✅ Removing subject label:', rawText);
    el.remove();
    return;
  }

  // Match Content:- or variants (Content;- etc.)
  if (/^content[:;,\-–]*$/i.test(normalizedText)) {
    console.log('✅ Removing content label:', rawText);
    el.remove();
    return;
  }

  // Remove known placeholder paragraph
  const lower = rawText.toLowerCase();
  if (
    lower.includes('{client business name}') &&
    lower.includes('{competitor business name}') &&
    lower.includes('organic visitors')
  ) {
    console.log('✅ Removing placeholder paragraph:', rawText);
    el.remove();
    return;
  }
});


const cleanedContent = tempDiv.innerHTML;




      return {
        subject: subject,
        content: cleanedContent
      };

    } else if (file.name.endsWith('.txt')) {
      const text = new TextDecoder().decode(arrayBuffer);
      
      console.log('TXT content:', text);
      
      // Extract subject from first line
      const lines = text.split('\n').filter(line => line.trim());
      const subject = lines.length > 0 ? lines[0].trim() : '';
      const remainingContent = lines.slice(1).join('\n');
      
      // Convert line breaks to HTML breaks for proper display
      const htmlContent = remainingContent.replace(/\n/g, '<br>');
      
      return {
        subject: subject,
        content: htmlContent
      };
      
    } else if (file.name.endsWith('.csv')) {
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (data.length < 1) {
        throw new Error('CSV file is empty');
      }

      // First row as subject, rest as content
      const subject = data.length > 0 && data[0].length > 0 ? data[0].join(' ').trim() : '';
      const contentRows = data.slice(1);
      
      const allContent = contentRows.map(row => 
        row.filter(cell => cell && String(cell).trim()).join(' ')
      ).filter(row => row.trim()).join('<br>');
      
      console.log('CSV subject:', subject, 'CSV content:', allContent);
      
      return {
        subject: subject,
        content: allContent
      };
    }

    throw new Error('Unsupported file format. Please use .docx, .txt, or .csv files.');
  } catch (error) {
    console.error('Error processing template:', error);
    throw new Error('Failed to process template file. Please check the file format and try again.');
  }
}

function extractSubjectFromHtml(html: string): string {
  // Try to extract subject from first heading
  const headingMatch = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
  if (headingMatch) {
    const headingText = headingMatch[1].replace(/<[^>]*>/g, '').trim();
    if (headingText.length > 0 && headingText.length < 150) {
      return headingText;
    }
  }
  
  // Try to extract from first paragraph if it's short enough to be a subject
  const paragraphMatch = html.match(/<p[^>]*>(.*?)<\/p>/i);
  if (paragraphMatch) {
    const firstLine = paragraphMatch[1].replace(/<[^>]*>/g, '').trim();
    // Only use as subject if it's reasonably short (less than 100 characters)
    if (firstLine.length > 0 && firstLine.length < 100) {
      return firstLine;
    }
  }
  
  // Try to extract first line from plain text if it looks like a subject
  const textContent = html.replace(/<[^>]*>/g, '').trim();
  const firstLine = textContent.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length < 100 && !firstLine.includes('.') && !firstLine.includes('?')) {
    return firstLine;
  }
  
  return '';
}

// function removeSubjectFromHtml(html: string, subject: string): string {
//   if (!subject) return html;
  
//   let content = html;
  
//   // Remove the first heading if it contains the subject
//   const headingRegex = new RegExp(`<h[1-6][^>]*>\\s*${escapeRegExp(subject)}\\s*<\\/h[1-6]>`, 'i');
//   content = content.replace(headingRegex, '');
  
//   // Remove the first paragraph if it exactly matches the subject
//   const exactParagraphRegex = new RegExp(`<p[^>]*>\\s*${escapeRegExp(subject)}\\s*<\\/p>`, 'i');
//   content = content.replace(exactParagraphRegex, '');
  
//   // If subject is still at the beginning of content, remove it
//   const textContent = content.replace(/<[^>]*>/g, '').trim();
//   if (textContent.startsWith(subject)) {
//     // Remove subject from the beginning of the text content
//     const subjectRegex = new RegExp(`^\\s*${escapeRegExp(subject)}\\s*`, 'i');
//     const cleanTextContent = textContent.replace(subjectRegex, '');
    
//     // If we removed the subject, rebuild the HTML without it
//     if (cleanTextContent !== textContent) {
//       // Find the first text node and remove the subject from it
//       content = content.replace(subject, '').replace(/^\s*<[^>]*>\s*/, '');
//     }
//   }
  
//   // Clean up any empty paragraphs or headings at the start
//   content = content.replace(/^\s*<(p|h[1-6])[^>]*>\s*<\/\1>\s*/i, '');
  
//   return content.trim();
// }

// function escapeRegExp(string: string): string {
//   return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

export async function processRecipients(file: File): Promise<Array<{ [key: string]: string }>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<{ [key: string]: string }>(worksheet, { raw: false });

    if (data.length === 0) {
      throw new Error('No data found in the file');
    }

    const requiredFields = ['email'];
    const headers = Object.keys(data[0]);
    const missingFields = requiredFields.filter(field =>
      !headers.some(h => h.toLowerCase().includes(field))
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // RFC 5322 email regex (very strict)
    const emailRegex =
      /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z-]*[a-zA-Z0-9]:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]+)\]))$/;

    return data.map((row, rowIndex) => {
      const cleanRow: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.trim();
        const cleanValue = String(value || '').trim();
        cleanRow[cleanKey] = cleanValue;
      }

      // Find the email column (case-insensitive)
      const emailKey = Object.keys(cleanRow).find(k => k.toLowerCase() === 'email');
      if (emailKey) {
        const emailValue = cleanRow[emailKey];
        if (!emailRegex.test(emailValue)) {
          throw new Error(`Invalid email format in row ${rowIndex + 2}: "${emailValue}"`);
        }
      }

      return cleanRow;
    });
  } catch (error) {
    console.error('Error processing recipients:', error);
    throw new Error(
      'Failed to process recipient data. Please check the file format and ensure all emails are valid.'
    );
  }
}



export function replacePlaceholders(
  text: string,
  data: { [key: string]: string }
): string {
  if (!text || !data) return text;

  try {
    let processedText = text;

    // Escape HTML attributes to prevent breaking the tag
    function escapeHtmlAttr(str: string) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    // Create case-insensitive lookup map
    const normalizedData: { [key: string]: string } = {};
    Object.entries(data).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      normalizedData[lowerKey] = value ?? "";
      normalizedData[key] = value ?? "";
    });

    // Regex to find {{ placeholder }} patterns
    const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    let match;
    const placeholders = new Set<string>();

    while ((match = placeholderRegex.exec(text)) !== null) {
      placeholders.add(match[1].trim());
    }

    placeholders.forEach((placeholderKey) => {
      const lowerPlaceholder = placeholderKey.toLowerCase();
      const value =
        normalizedData[placeholderKey] || normalizedData[lowerPlaceholder] || "";

      const placeholderPattern = new RegExp(
        `\\{\\{\\s*${placeholderKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}\\}`,
        "gi"
      );

      if (value) {
        // Strict image detection
        const isImage =
          /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(value) ||
          /(image|photo|picture|avatar|screenshot)/i.test(lowerPlaceholder) ||
          /(gyazo\.com|imgur\.com|unsplash\.com)/i.test(value);

        if (isImage && /^https?:\/\//i.test(value.trim())) {
          // Handle Gyazo direct URL conversion
          let imageUrl = value.trim();
          if (imageUrl.includes("gyazo.com") && !imageUrl.includes("i.gyazo.com")) {
  const idMatch = imageUrl.match(/gyazo\.com\/([a-zA-Z0-9]+)/);
  if (idMatch && idMatch[1]) {
    imageUrl = `https://i.gyazo.com/${idMatch[1]}.png`;
  }
}

          const altText = placeholderKey
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          processedText = processedText.replace(
            placeholderPattern,
            `<img src="${escapeHtmlAttr(imageUrl)}" alt="${escapeHtmlAttr(
              altText
            )}" style="max-width:40%; height:auto; border-radius:8px; margin:12px 0; display:block;"/>`
          );
        } else {
          // Normal text replacement (escaped for safety)
          processedText = processedText.replace(
            placeholderPattern,
            escapeHtmlAttr(value)
          );
        }
      } else {
        // No value → remove placeholder entirely
        processedText = processedText.replace(placeholderPattern, "");
      }
    });

    return processedText;
  } catch (error) {
    console.error("Error replacing placeholders:", error);
    return text;
  }
}
