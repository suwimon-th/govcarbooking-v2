const fs = require('fs');
let content = fs.readFileSync('app/print/inspection/[id]/page.tsx', 'utf8');

// Adjust Checkbox Container Width
content = content.replace(/<div className="w-\[7.5cm\] shrink-0 font-normal pr-2">\{item.label\}<\/div>/g, '<div className="w-[8.5cm] shrink-0 font-normal pr-1">{item.label}</div>');
content = content.replace(/<div className="flex-\[0.8\] flex text-\[16pt\] items-start pt-\[0.1cm\]">/g, '<div className="flex-1 flex text-[16pt] items-start pt-[0.1cm]">');
content = content.replace(/<div className="w-\[3.5cm\] flex items-center">/g, '<div className="w-[3cm] flex items-center">');

fs.writeFileSync('app/print/inspection/[id]/page.tsx', content);
