import { isSupabaseConfigured, supabase } from './supabase';

function uploadAsBase64(file: File): Promise<{ url: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        url: reader.result as string,
        fileName: file.name
      });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadAttachment(file: File, bucket = 'payment-supports'): Promise<{ url: string; fileName: string }> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${Date.now()}_${cleanFileName}`;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.warn('Supabase Storage RLS or Upload Error, falling back to Base64:', uploadError.message);
        return uploadAsBase64(file);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        fileName: file.name
      };
    } catch (err) {
      console.warn('Supabase Storage exception, falling back to Base64:', err);
      return uploadAsBase64(file);
    }
  } else {
    // Fallback Local Storage via Base64 Data URL
    return uploadAsBase64(file);
  }
}
