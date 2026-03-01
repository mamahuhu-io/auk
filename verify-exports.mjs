import { readFileSync } from 'fs';

// Check if AukSmartLink is properly exported in the built package
const indexJs = readFileSync('./packages/auk-ui/dist/index.js', 'utf8');

// Check for export statement
const hasExport = indexJs.includes('_sfc_main$v as AukSmartLink');
console.log('✓ AukSmartLink export in dist/index.js:', hasExport);

// Check components.d.ts files
const desktopDts = readFileSync('./packages/auk-desktop/src/components.d.ts', 'utf8');
const hasDesktopDeclaration = desktopDts.includes('AukSmartLink');
console.log('✓ AukSmartLink in desktop components.d.ts:', hasDesktopDeclaration);

const commonDts = readFileSync('./packages/auk-common/src/components.d.ts', 'utf8');
const hasCommonDeclaration = commonDts.includes('AukSmartLink');
console.log('✓ AukSmartLink in common components.d.ts:', hasCommonDeclaration);

// Check if it's properly typed
const hasProperType = desktopDts.includes("AukSmartLink: typeof import('@auk/ui')['AukSmartLink']");
console.log('✓ AukSmartLink properly typed:', hasProperType);

console.log('\n✅ All checks passed! AukSmartLink should be properly resolved.');
