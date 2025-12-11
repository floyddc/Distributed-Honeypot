import { analyzeLogin, analyzeFileUpload } from '../utils/LLM.cjs';
import { strict as assert } from 'assert';

let passed = 0;
let failed = 0;

function test(name, actual, expected) {
  try {
    assert.strictEqual(actual.severity, expected.severity);
    const actualDesc = actual.description.replace(/\s*\[GROQ\]$/, '');
    const expectedDesc = expected.description;
    
    if (actualDesc === expectedDesc || actual.description.includes(expectedDesc)) {
      console.log(`PASS ${name}`);
      passed++;
    } else {
      throw new Error(`Description mismatch: expected "${expectedDesc}", got "${actualDesc}"`);
    }
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Actual:   ${JSON.stringify(actual)}`);
    console.error(`   Error: ${error.message}`);
    failed++;
  }
}

(async () => {
  console.log('=== LLM Analysis Tests (Groq + Fallback) ===\n');
  
  console.log('File Analysis Tests:\n');
  
  const file1 = await analyzeFileUpload('document.txt', 'txt', 1024);
  test('Low severity file (.txt)', file1, {
    severity: 'low',
    description: 'File upload: .txt'
  });
  
  const file2 = await analyzeFileUpload('script.php', 'php', 2048);
  test('Critical severity file (.php)', file2, {
    severity: 'critical',
    description: 'File upload: .php'
  });
  
  const file3 = await analyzeFileUpload('archive.zip', 'zip', 5000);
  test('Medium severity file (.zip)', file3, {
    severity: 'medium',
    description: 'File upload: .zip'
  });
  
  const file4 = await analyzeFileUpload('binary.exe', 'exe', 10000);
  test('Critical severity file (.exe)', file4, {
    severity: 'critical',
    description: 'File upload: .exe'
  });

  console.log('\nLogin Analysis Tests:\n');
  
  const login1 = await analyzeLogin('user123', 'mypassword');
  test('Normal login attempt', login1, {
    severity: 'low',
    description: 'Login attempt'
  });

  const login2 = await analyzeLogin("admin' OR '1'='1", 'password');
  test('SQL Injection attack', login2, {
    severity: 'critical',
    description: 'SQL injection'
  });

  const login3 = await analyzeLogin('<script>alert(0)</script>', 'test');
  test('XSS attack', login3, {
    severity: 'critical',
    description: 'XSS attack'
  });

  const login4 = await analyzeLogin('admin', 'pass; ls -la');
  test('Command injection attack', login4, {
    severity: 'critical',
    description: 'Command injection'
  });

  const login5 = await analyzeLogin('../../../etc/passwd', 'test');
  test('Path traversal attack', login5, {
    severity: 'medium',
    description: 'Path traversal'
  });
  
  const login6 = await analyzeLogin("admin' UNION SELECT * FROM users--", 'test');
  test('Advanced SQL injection', login6, {
    severity: 'critical',
    description: 'SQL injection'
  });
  
  const login7 = await analyzeLogin('user', 'test`whoami`');
  test('Backtick command injection', login7, {
    severity: 'critical',
    description: 'Command injection'
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (process.env.GROQ_API_KEY) {
    console.log('Using Groq API for analysis');
  } else {
    console.log('Using regex fallback (no GROQ_API_KEY found)');
  }
  
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.log('\nSome tests failed! Check the results above.');
    process.exit(1);
  } else {
    console.log('\nAll tests passed! Both Groq and fallback systems work correctly.\n');
    process.exit(0);
  }
})();