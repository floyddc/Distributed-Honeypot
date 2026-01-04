let groq = null;
try {
  const Groq = require('groq-sdk');
  groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY 
  });
} catch (error) {
  console.log('Groq SDK not installed, using regex fallback only');
}

// Fallback
function quickAnalyzeLogin(username, password) {
  const combined = `${username} ${password}`.toLowerCase();
  
  if (/(\.\.|%2e%2e|%252e)/i.test(combined)) {
    return { severity: 'medium', description: 'Path traversal [Fallback]' };
  }
  
  if (/(\bor\b.*=|union\b.*select|insert\b.*into|delete\b.*from|drop\b.*table|'|"|;--|\*|\/\*)/.test(combined)) {
    return { severity: 'critical', description: 'SQL injection [Fallback]' };
  }
  
  if (/<script|<iframe|javascript:|onerror=|onload=|eval\(|alert\(/i.test(combined)) {
    return { severity: 'critical', description: 'XSS attack [Fallback]' };
  }
  
  if (/(\||&|`|\$\(|\bls\b|\bcat\b|\bwhoami\b|\bpwd\b|\brm\b|\bmv\b|\bcp\b)/.test(combined)) {
    return { severity: 'critical', description: 'Command injection [Fallback]' };
  }
  
  return { severity: 'low', description: 'Login attempt [Fallback]' };
}

function quickAnalyzeFile(fileExtension) {
  const ext = fileExtension.toLowerCase().replace(/^\./, '');
  
  if (/^(exe|sh|bat|php|jsp|dll|ps1|cmd|msi|app|deb|rpm|scr|vbs|jar|war)$/.test(ext)) {
    return 'critical';
  }
  
  if (/^(js|py|sql|zip|rar|7z|tar|gz|pl|rb|asp|aspx|cgi)$/.test(ext)) {
    return 'medium';
  }
  
  return 'low';
}

async function callGroq(prompt) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
      model: 'llama-3.1-8b-instant',
      max_tokens: 10,
      temperature: 0,
      top_p: 0.1
    });
    
    return completion.choices[0]?.message?.content?.trim();
  } catch (error) {
    console.log(`Groq error: ${error.message} - using regex fallback`);
    return null;
  }
}

async function analyzeLogin(username, password, useLLM = true) {
  if (useLLM && groq) {
    const prompt = `You are a security analyzer. Classify this login attempt with ONE word only.

Input: username="${username}" password="${password}"

Classifications:
- SQLI (SQL injection: ', ", --, union, select, drop)
- XSS (Cross-site scripting: <script>, javascript:, alert)
- CMDI (Command injection: |, &, ;, \`, $())
- PATH (Path traversal: ../, %2e%2e)
- NORMAL (normal login attempt)

Answer with ONE word only:`;

    const llmResponse = await callGroq(prompt);

    if (llmResponse) {
      const response = llmResponse.trim().toUpperCase();
      const matched = response.match(/\b(SQLI|XSS|CMDI|PATH|NORMAL)\b/);
      const detectedType = matched ? matched[1] : null;
      console.log('GROQ detection:', detectedType || response);

      switch (detectedType) {
        case 'SQLI':
          return { severity: 'critical', description: 'SQL injection [GROQ]' };
        case 'XSS':
          return { severity: 'critical', description: 'XSS attack [GROQ]' };
        case 'CMDI':
          return { severity: 'critical', description: 'Command injection [GROQ]' };
        case 'PATH':
          return { severity: 'medium', description: 'Path traversal [GROQ]' };
        case 'NORMAL':
          return { severity: 'low', description: 'Login attempt [GROQ]' };
        default:
          console.log('Invalid Groq output, using regex fallback');
      }
    }
  }
  
  console.log('Using regex fallback');
  return quickAnalyzeLogin(username, password);
}

async function analyzeFileUpload(filename, fileExtension, fileSize, useLLM = true) {
  if (useLLM && groq) {
    const prompt = `You are a file security analyzer. Classify this file extension with ONE word only.

File: ${filename}
Extension: .${fileExtension}

Classifications:
- CRITICAL (executables: exe, sh, bat, php, jsp, dll, ps1, cmd, jar, war)
- MEDIUM (scripts/archives: js, py, sql, zip, rar, 7z, tar, gz)
- LOW (safe files: txt, jpg, png, pdf, csv, json)

Answer with ONE word only:`;

    const llmResponse = await callGroq(prompt);

    if (llmResponse) {
      const response = llmResponse.trim().toUpperCase();
      const matched = response.match(/\b(CRITICAL|MEDIUM|LOW)\b/);
      const detectedType = matched ? matched[1] : null;
      console.log('GROQ file analysis:', detectedType || response);

      switch (detectedType) {
        case 'CRITICAL':
          return { severity: 'critical', description: `Malicious file: .${fileExtension} [GROQ]` };
        case 'MEDIUM':
          return { severity: 'medium', description: `Suspicious file: .${fileExtension} [GROQ]` };
        case 'LOW':
          return { severity: 'low', description: `File upload: .${fileExtension} [GROQ]` };
        default:
          console.log('Invalid Groq file output, using regex fallback');
      }
    }
  }
  
  console.log('Using regex fallback for file');
  const quickSeverity = quickAnalyzeFile(fileExtension);
  return {
    severity: quickSeverity,
    description: `File upload: .${fileExtension}`
  };
}

module.exports = {
  analyzeLogin,
  analyzeFileUpload
};