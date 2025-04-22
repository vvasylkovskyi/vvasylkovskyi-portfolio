import fs from 'fs';
import path from 'path';

export const getResume = () => {
  const filePathBlogPostTextDataPath = path.join(
    process.cwd(),
    './resume/Viktor_Vasylkovskyi_Senior_Product_Engineer.pdf',
  );

  const fileBuffer = fs.readFileSync(filePathBlogPostTextDataPath);
  return fileBuffer;
};
