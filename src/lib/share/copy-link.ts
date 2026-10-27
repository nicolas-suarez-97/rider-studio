export function copyWithCommand(text: string) {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '0';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.focus();
  field.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  field.remove();
  return copied;
}

export async function writeToClipboard(text: string) {
  if (copyWithCommand(text)) return true;

  try {
    if (!navigator.clipboard?.writeText) return false;
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('clipboard-timeout')), 700);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}
