const fs = require('fs');
let content = fs.readFileSync('app/print/inspection/[id]/page.tsx', 'utf8');

// replace padding and spacing to fit exactly A4 16pt and match comment requirements
content = content.replace(/p-\[1.2cm\] sm:p-\[1.5cm\]/g, 'p-[0.5cm] sm:p-[1cm]');
content = content.replace(/margin: 0.5cm 1.5cm;/g, 'margin: 1cm 1.5cm;');

fs.writeFileSync('app/print/inspection/[id]/page.tsx', content);
