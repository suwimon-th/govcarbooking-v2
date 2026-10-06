import ExcelJS from 'exceljs';
import { reportLayouts, type ReportSheet } from './fuel-workbook';
export async function createFuelWorkbook(sheets:ReportSheet[]) {
 const workbook=new ExcelJS.Workbook();workbook.creator='GovCarBooking';workbook.calcProperties.fullCalcOnLoad=true;
 for(const source of sheets){
  const sheet=workbook.addWorksheet(source.name,{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.2,right:.2,top:.3,bottom:.3,header:.1,footer:.1}},views:[{showGridLines:false}]});
  sheet.columns=source.widths.map(width=>({width}));
  source.rows.forEach((values,i)=>{const row=sheet.addRow(values);row.height=i<source.headerRows&&source.kind!=='method'?reportLayouts()[source.kind].rows[i].height:source.kind==='summary'&&i<(source.tableEndRow??source.rows.length-7)?38:26;
   for(let c=1;c<=source.widths.length;c++){const cell=row.getCell(c);cell.font={name:'TH Sarabun New',size:16};cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};cell.numFmt=c===1?'0':'#,##0.##';
    if(i<source.headerRows&&source.kind!=='method'){const style=reportLayouts()[source.kind].rows[i].cells[c-1]?.style;if(style)cell.style=JSON.parse(JSON.stringify(style));}
    else if(values.length&&source.kind!=='method'&&i<(source.tableEndRow??source.rows.length-7)){const edge={style:'thin' as const,color:{argb:'FF000000'}};cell.border={top:edge,bottom:edge,left:edge,right:edge};}
   }
  });
  if(source.kind==='summary'){
   const layout=reportLayouts().summary;
   for(let r=source.headerRows+1;r<=source.rows.length;r++){
    const dataRow=r<=(source.tableEndRow??0);const name=String(source.rows[r-1]?.[1]??'');sheet.getRow(r).height=dataRow&&name.length>25?layout.bodyHeight*2:layout.bodyHeight;
    for(let c=1;c<=source.widths.length;c++){
     const cell=sheet.getCell(r,c);cell.style=JSON.parse(JSON.stringify(dataRow?layout.bodyStyles[c-1]:layout.signatureStyle));
     cell.numFmt=c===1?'0':'#,##0.##';
     if(dataRow&&c===2)cell.alignment={...cell.alignment,wrapText:true};
    }
   }
  }
  if(source.kind==='vehicle'){
   for(let r=9;r<=20;r++){
    const first=sheet.getCell(r,6),middle=sheet.getCell(r,7),last=sheet.getCell(r,8);
    first.border={...first.border,right:undefined};
    middle.border={...middle.border,left:undefined,right:undefined};
    last.border={...last.border,left:undefined};
    for(const cell of [first,last])cell.numFmt='#,##0';
   }
  }
  source.merges.forEach(merge=>sheet.mergeCells(merge));
  Object.entries(source.formulas).forEach(([address,value])=>{sheet.getCell(address).value=value;sheet.getCell(address).numFmt='0.00';});
  sheet.pageSetup.printArea=`A1:${sheet.getColumn(source.widths.length).letter}${source.rows.length}`;
  if(source.headerRows>1)sheet.pageSetup.printTitlesRow=`1:${source.headerRows}`;
 }
 return workbook;
}
export async function downloadFuelWorkbook(sheets:ReportSheet[],filename:string){
 const workbook=await createFuelWorkbook(sheets),buffer=await workbook.xlsx.writeBuffer();
 const blob=new Blob([new Uint8Array(buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${filename}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
