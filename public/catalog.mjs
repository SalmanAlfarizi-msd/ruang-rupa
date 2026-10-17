export const catalogVersion = 'demo-2026-10-16';
export const materials = [
  {id:'jati', name:'Kayu jati', color:'#b88a56', finishes:['natural','walnut']},
  {id:'oak', name:'Veneer oak', color:'#cfb389', finishes:['natural','walnut']},
  {id:'mdf', name:'MDF', color:'#adb5a4', finishes:['sage','ivory']}
];
export const finishes = [
  {id:'natural',name:'Natural',color:'#bc945f'}, {id:'walnut',name:'Walnut',color:'#71503a'},
  {id:'sage',name:'Sage',color:'#8d9a83'}, {id:'ivory',name:'Ivory',color:'#ded8ca'}
];
export const options = [{id:'cable',name:'Lubang kabel'}, {id:'softclose',name:'Engsel soft-close'}, {id:'shelf',name:'Rak tambahan'}];
const base = {materials:['jati','oak','mdf'], constraints:{approved:false, technicalMax:10000, step:0.1}, active:true};
export const products = [
  {...base,id:'senja',name:'Senja',type:'Sideboard',category:'sideboard',tag:'Pilihan studio',description:'Garis sederhana, ruang simpan yang lega. Senja menghadirkan keseimbangan antara fungsi sehari-hari dan kehangatan ruang keluarga.',dimensions:{width:160,height:75,depth:40},material:'jati',finish:'natural',options:['cable','softclose','shelf'],variant:'cabinet'},
  {...base,id:'laras',name:'Laras',type:'Kabinet TV',category:'kabinet-tv',tag:'Ruang keluarga',description:'Profil rendah dengan kompartemen terbuka untuk perangkat dan buku favorit. Sebuah titik temu yang tenang di ruang keluarga.',dimensions:{width:180,height:45,depth:40},material:'oak',finish:'natural',options:['cable','softclose'],variant:'tv'},
  {...base,materials:['jati','oak'],id:'sela',name:'Sela',type:'Rak buku',category:'rak-buku',tag:'Sudut personal',description:'Ruang bagi buku, benda kenangan, dan cerita Anda. Komposisi rak terbuka memberi karakter tanpa membuat ruangan terasa penuh.',dimensions:{width:90,height:180,depth:35},material:'oak',finish:'natural',options:['shelf'],variant:'shelf'},
  {...base,id:'nara',name:'Nara',type:'Sideboard',category:'sideboard',tag:'Warna lembut',description:'Bidang bersih dalam warna lembut, dipadukan kaki ramping. Nara memberi sentuhan segar untuk sudut makan atau foyer.',dimensions:{width:140,height:80,depth:40},material:'mdf',finish:'sage',options:['softclose','shelf'],variant:'cabinet'},
  {...base,materials:['jati','oak'],id:'temu',name:'Temu',type:'Meja',category:'meja',tag:'Ruang bersama',description:'Tempat ide dan percakapan bertemu. Permukaan luas dengan siluet ringan untuk kegiatan sehari-hari.',dimensions:{width:160,height:75,depth:80},material:'jati',finish:'natural',options:['cable'],variant:'table'},
  {...base,id:'ranu',name:'Ranu',type:'Kabinet TV',category:'kabinet-tv',tag:'Nuansa hangat',description:'Bidang kayu bernuansa gelap dengan penyimpanan tertutup untuk ruang yang tertata dan terasa hangat.',dimensions:{width:160,height:50,depth:40},material:'jati',finish:'walnut',options:['cable','softclose'],variant:'tv'}
];
export const categories = [{id:'sideboard',name:'Sideboard'},{id:'kabinet-tv',name:'Kabinet TV'},{id:'rak-buku',name:'Rak buku'},{id:'meja',name:'Meja'}];
export const findProduct = id => products.find(p=>p.id===id);
export const defaultConfiguration = p => ({productId:p.id,...p.dimensions,material:p.material,finish:p.finish,options:[],quantity:1});
export function validateConfiguration(c) {
  const errors = {};
  if (!c || typeof c !== 'object') return {configuration:'Pilih model dan lengkapi konfigurasi.'};
  const p = findProduct(c.productId);
  if (!p) return {productId:'Model tidak ditemukan. Pilih ulang dari katalog.'};
  for (const [key,label] of [['width','Lebar'],['height','Tinggi'],['depth','Kedalaman']]) {
    const n=c[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n<=0 || n>p.constraints.technicalMax || Math.abs(n*10-Math.round(n*10))>1e-7) errors[key]=`${label} harus lebih dari 0, maksimal 10.000 cm, dengan satu angka desimal. Batas ini hanya batas input teknis.`;
  }
  const material=materials.find(m=>m.id===c.material);
  if (!material || !p.materials.includes(c.material)) errors.material='Pilih material yang tersedia untuk model ini.';
  if (!material?.finishes.includes(c.finish)) errors.finish='Finishing tidak sesuai material. Pilih ulang finishing.';
  if (!Array.isArray(c.options) || c.options.some(o=>!p.options.includes(o)) || new Set(c.options).size!==c.options.length) errors.options='Opsi tambahan tidak sesuai model.';
  if (!Number.isInteger(c.quantity) || c.quantity<1 || c.quantity>100) errors.quantity='Jumlah harus bilangan bulat 1–100 (batas formulir).';
  return errors;
}
export function validateRequest(body) {
  const errors=validateConfiguration(body?.configuration);
  const customer=body?.customer;
  if (typeof customer?.name!=='string' || customer.name.trim().length<2 || customer.name.length>100) errors.name='Isi nama dengan 2–100 karakter.';
  const contact=typeof customer?.contact==='string'?customer.contact.trim():'';
  const digits=contact.replace(/\D/g,'');
  const phone=/^\+?[\d ()-]{8,25}$/.test(contact)&&digits.length>=8&&digits.length<=15;
  if (typeof customer?.contact!=='string' || customer.contact.length>150 || !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || phone)) errors.contact='Masukkan email yang valid atau nomor telepon dengan 8–15 digit.';
  if (typeof customer?.location!=='string' || customer.location.trim().length<2 || customer.location.length>200) errors.location='Isi kota/kabupaten tujuan, 2–200 karakter.';
  if (typeof body?.notes!=='string' || body.notes.length>2000) errors.notes='Catatan maksimal 2.000 karakter.';
  if (body?.consent!==true) errors.consent='Setujui penyimpanan data untuk permintaan ini.';
  return errors;
}
