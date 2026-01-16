// Utility to handle recursive file scanning

export async function scanDroppedItems(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = [];
  
  const entries = Array.from(items)
    .map(item => item.webkitGetAsEntry())
    .filter(entry => entry !== null);

  for (const entry of entries) {
    if (entry) {
      await traverseFileTree(entry, files);
    }
  }

  return files;
}

// Drag and Drop Traversal (Legacy Webkit API)
async function traverseFileTree(item: any, fileList: File[]) {
  if (item.isFile) {
    const file = await new Promise<File>((resolve) => item.file(resolve));
    
    // Attempt to shim webkitRelativePath for subfolder logic
    const path = item.fullPath.startsWith('/') ? item.fullPath.substring(1) : item.fullPath;
    
    try {
      Object.defineProperty(file, 'webkitRelativePath', {
        value: path,
        writable: false,
        configurable: true
      });
    } catch (e) {
       (file as any)._fullPath = path;
    }
    
    fileList.push(file);
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    const entries = await readAllEntries(dirReader);
    for (const entry of entries) {
      await traverseFileTree(entry, fileList);
    }
  }
}

async function readAllEntries(dirReader: any): Promise<any[]> {
  const entries: any[] = [];
  let readEntries = await readEntriesBatch(dirReader);
  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await readEntriesBatch(dirReader);
  }
  return entries;
}

function readEntriesBatch(dirReader: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    dirReader.readEntries(resolve, reject);
  });
}

// File System Access API Traversal
export async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle, 
  pathPrefix: string = ''
): Promise<File[]> {
  const files: File[] = [];

  for await (const entry of dirHandle.values()) {
    const newPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    
    if (entry.kind === 'file') {
      if (entry.name.toLowerCase().endsWith('.pdf')) {
        // Cast to specific handle type to access getFile
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        
        // Shim path info
        try {
            Object.defineProperty(file, 'webkitRelativePath', {
                value: newPath,
                writable: false,
                configurable: true
            });
        } catch {
             (file as any)._fullPath = newPath;
        }
        
        files.push(file);
      }
    } else if (entry.kind === 'directory') {
      // Cast to specific handle type for recursion
      const subDirHandle = entry as FileSystemDirectoryHandle;
      const subFiles = await scanDirectoryHandle(subDirHandle, newPath);
      files.push(...subFiles);
    }
  }

  return files;
}