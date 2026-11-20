/* DoWeo Backdrop image compatibility
   Safely rasterizes user-selected images into a small JPEG accepted by the
   existing tracker-backdrops API. HEIC/HEIF and TIFF decoders are bundled locally
   and loaded only for files the browser cannot decode itself. */
(function(global){
 'use strict';

 const MAX_INPUT_BYTES=40*1024*1024;
 const MAX_PIXELS=70*1000*1000;
 const MAX_JPEG_BYTES=4.6*1024*1024;
 const loaders=Object.create(null);

 function fmt(file){
  const name=String(file?.name||'').toLowerCase();
  const mime=String(file?.type||'').toLowerCase();
  return {
   heic:/\.(heic|heif|hif)$/.test(name)||/^image\/(heic|heif|heic-sequence|heif-sequence)$/.test(mime),
   tiff:/\.(tif|tiff)$/.test(name)||mime==='image/tiff'
  };
 }

 function loadLocal(path,exportName){
  if(global[exportName])return Promise.resolve(global[exportName]);
  if(!loaders[path]){
   loaders[path]=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=path;
    script.async=true;
    script.onload=()=>{
     if(global[exportName])resolve(global[exportName]);
     else reject(new Error('The image decoder could not start. Please refresh DoWeo and retry.'));
    };
    script.onerror=()=>reject(new Error('The image converter could not load. Check your connection and try again.'));
    document.head.appendChild(script);
   }).catch(e=>{delete loaders[path];throw e});
  }
  return loaders[path];
 }

 function openImage(blob){
  return new Promise((resolve,reject)=>{
   const img=new Image();
   const url=URL.createObjectURL(blob);
   let done=false;
   function finish(error){
    if(done)return;
    done=true;
    URL.revokeObjectURL(url);
    if(error)reject(error);
    else resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,dispose:()=>{}});
   }
   img.onload=()=>finish();
   img.onerror=()=>finish(new Error('Browser could not decode image'));
   img.src=url;
  });
 }

 async function nativeDecode(blob){
  if(typeof createImageBitmap==='function'){
   try{
    const bitmap=await createImageBitmap(blob);
    return {source:bitmap,width:bitmap.width,height:bitmap.height,dispose:()=>bitmap.close?.()};
   }catch(_){} // <img> is more compatible with Safari and SVG.
  }
  return openImage(blob);
 }

 async function tiffDecode(file){
  const utif=await loadLocal('/third_party/UTIF.js?v=3.1.0','UTIF');
  const bytes=await file.arrayBuffer();
  const pages=utif.decode(bytes);
  if(!pages?.length)throw new Error('No image found in this TIFF.');
  const page=pages[0];
  const width=Number(page.width),height=Number(page.height);
  if(!(width>0&&height>0&&width*height<=MAX_PIXELS))
   throw new Error('This TIFF is too large to process on this device.');
  utif.decodeImage(bytes,page);
  const rgba=utif.toRGBA8(page);
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Image processing is not available in this browser.');
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);
  return {source:canvas,width,height,dispose:()=>{canvas.width=canvas.height=0}};
 }

 async function heicDecode(file){
  const convert=await loadLocal('/third_party/heic2any.min.js?v=0.0.4','heic2any');
  const result=await convert({blob:file,toType:'image/jpeg',quality:0.9});
  const blob=Array.isArray(result)?result[0]:result;
  if(!blob||!blob.size)throw new Error('Could not convert the HEIC/HEIF photo.');
  return nativeDecode(blob);
 }

 function toJpeg(canvas,quality){
  return new Promise((resolve,reject)=>{
   if(!canvas.toBlob){reject(new Error('Photo export is unsupported in this browser.'));return}
   canvas.toBlob(blob=>{
    if(blob?.size&&blob.type==='image/jpeg')resolve(blob);
    else reject(new Error('Could not prepare the photo for upload.'));
   },'image/jpeg',quality);
  });
 }

 async function prepareBackdrop(file,onStatus){
  if(!(file instanceof Blob)||!file.size)throw new Error('Choose an image file to upload.');
  if(file.size>MAX_INPUT_BYTES)throw new Error('Image is too large. Choose a photo under 40 MB.');
  const f=fmt(file);
  let decoded;
  try{
   try{
    decoded=await nativeDecode(file);
   }catch(originalError){
    if(f.heic){
     onStatus?.('Converting your HEIC/HEIF photo…');
     decoded=await heicDecode(file);
    }else if(f.tiff){
     onStatus?.('Converting your TIFF photo…');
     decoded=await tiffDecode(file);
    }else{
     throw new Error('This image cannot be opened on this device. Try saving it as JPEG, PNG, or HEIC.');
    }
   }
   const width=Number(decoded.width),height=Number(decoded.height);
   if(!(width>0&&height>0)||width*height>MAX_PIXELS)
    throw new Error('This image is too large to process. Choose a smaller image.');
   const canvas=document.createElement('canvas');
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw new Error('Image processing is not available in this browser.');

   const max=1920;
   let scale=Math.min(1,max/Math.max(width,height));
   for(let attempt=0;attempt<7;attempt++){
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    // Transparent PNG/SVG/GIF pixels become a consistent navy backdrop.
    ctx.fillStyle='#0b2438';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(decoded.source,0,0,canvas.width,canvas.height);
    const quality=Math.max(.55,.87-attempt*.045);
    const result=await toJpeg(canvas,quality);
    if(result.size<=MAX_JPEG_BYTES){
     canvas.width=canvas.height=0;
     return result;
    }
    scale*=.78;
   }
   throw new Error('This image could not be reduced to upload size. Choose a smaller photo.');
  }catch(error){
   if(error?.message&&/^(This |Choose |Image |Photo |Could |The |No image)/.test(error.message))throw error;
   throw new Error('This image could not be decoded. Try another image or export it as JPG or PNG.');
  }finally{
   decoded?.dispose?.();
  }
 }

 global.DoWeoBackdropImages=Object.freeze({prepareBackdrop,formatInfo:fmt});
})(window);
