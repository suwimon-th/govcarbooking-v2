const fs = require('fs');
let content = fs.readFileSync('app/print/inspection/[id]/page.tsx', 'utf8');

// replace padding and spacing to fit exactly A4 16pt
content = content.replace(/p-\[1.5cm\] sm:p-\[2cm\]/g, 'p-[1cm] sm:p-[1.5cm]');
content = content.replace(/margin: 1cm 1.5cm;/g, 'margin: 0.5cm 1.5cm;');
content = content.replace(/leading-\[1.3\]/g, 'leading-tight');

fs.writeFileSync('app/print/inspection/[id]/page.tsx', content);
