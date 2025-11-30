import { evaluateFileSeverity, evaluateLoginSeverity, recognizeThreat} from '../utils/GeminiAPI.js';

(async () => {
  try {
    console.log('Testing File Severity...');
    const fileSeverity1 = await evaluateFileSeverity('txt');
    console.log('File Severity (low):', fileSeverity1);
    const fileSeverity2 = await evaluateFileSeverity('php');
    console.log('File Severity (medium):', fileSeverity2);

    console.log('Testing Login Severity...');
    const loginSeverity = await evaluateLoginSeverity('admin', 'password123');
    console.log('Login Severity:', loginSeverity);

    console.log('\nTesting Threat Recognition...');
    
    const threat1 = await recognizeThreat('user123', 'mypassword');
    console.log('Test 1 (Normal):', threat1);

    const threat2 = await recognizeThreat("admin' OR '1'='1", "password");
    console.log('Test 2 (SQL Injection):', threat2);

    const threat3 = await recognizeThreat('<script>alert(0)</script>', 'test');
    console.log('Test 3 (XSS):', threat3);
  } catch (error) {
    console.error('Errore durante il test:', error.message);
  }
})();