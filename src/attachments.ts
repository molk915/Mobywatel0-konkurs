const DB = "mobywatel-demo-files";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveAttachment(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Wybierz plik do 5 MB.");
  if (!/\.(pdf|txt|jpg|jpeg|png)$/i.test(file.name))
    throw new Error("Wybierz PDF, TXT, JPG lub PNG.");
  const db = await openDB(),
    key = crypto.randomUUID();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(file, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return key;
  } finally {
    db.close();
  }
}
export async function downloadAttachment(key: string, name: string) {
  const db = await openDB();
  let file: Blob | undefined;
  try {
    file = await new Promise((resolve, reject) => {
      const r = db.transaction("files").objectStore("files").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
  if (!file) throw new Error("Plik nie jest już dostępny w tej przeglądarce.");
  const url = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function clearAttachments() {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
