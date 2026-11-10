function selectImage(source) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.onchange = () => resolve(input.files?.[0] || null);
    input.click();
  });
}

export async function pickSingleImage(source) {
  const file = await selectImage(source);
  return file ? { uri: file, name: file.name, type: file.type } : null;
}
