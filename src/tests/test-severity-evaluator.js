import { evaluateFileSeverity, evaluateLoginSeverity } from '../utils/severity-evaluator.js';

(async () => {
  try {
    console.log('Testing File Severity...');
    const fileSeverity = await evaluateFileSeverity('txt');
    console.log('File Severity:', fileSeverity);

    console.log('Testing Login Severity...');
    const loginSeverity = await evaluateLoginSeverity('admin', 'password123');
    console.log('Login Severity:', loginSeverity);
  } catch (error) {
    console.error('Errore durante il test:', error.message);
  }
})();