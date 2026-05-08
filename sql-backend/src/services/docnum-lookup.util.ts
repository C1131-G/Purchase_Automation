export const lookupDocNum = async (
  _dbName: string,
  _docType: string,
  _search: string,
  _limit = 10,
) => ({ data: [], total: 0 });

export const validateDocNum = (docNum: string): boolean => /^\d+$/.test(docNum);

export const docnumLookup = { lookupDocNum, validateDocNum };
