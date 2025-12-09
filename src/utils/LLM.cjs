function quickAnalyzeLogin(username, password) {
  const combined = `${username} ${password}`.toLowerCase();
  
  if (/(\.\.|%2e%2e|%252e)/i.test(combined)) {
    return { severity: 'medium', description: 'Path traversal' };
  }
  
  if (/(\bor\b.*=|union\b.*select|insert\b.*into|delete\b.*from|drop\b.*table|'|"|;--|\*|\/\*)/.test(combined)) {
    return { severity: 'critical', description: 'SQL injection' };
  }
  
  if (/<script|<iframe|javascript:|onerror=|onload=|eval\(|alert\(/i.test(combined)) {
    return { severity: 'critical', description: 'XSS attack' };
  }
  
  if (/(\||&|`|\$\(|\bls\b|\bcat\b|\bwhoami\b|\bpwd\b|\brm\b|\bmv\b|\bcp\b)/.test(combined)) {
    return { severity: 'critical', description: 'Command injection' };
  }
  
  return { severity: 'low', description: 'Login attempt' };
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

async function analyzeLogin(username, password, useLLM = false) {
  const quickResult = quickAnalyzeLogin(username, password);
  if (quickResult.severity === 'critical') {
    console.log('Quick detection:', quickResult.description);
    return quickResult;
  }
  return quickResult;
}

async function analyzeFileUpload(filename, fileExtension, fileSize, useLLM = false) {
  const severity = quickAnalyzeFile(fileExtension);
  console.log(`File analysis: ${filename} (${fileExtension}) → ${severity}`);
  return {
    severity: severity,
    description: `File upload: .${fileExtension}`
  };
}

module.exports = {
  analyzeLogin,
  analyzeFileUpload
};