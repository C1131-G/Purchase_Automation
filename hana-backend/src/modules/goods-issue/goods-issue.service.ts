import { createGoodsIssue, updateGoodsIssue } from "./goods-issue.mutations";
import { getGoodsIssues, getGoodsIssueByDocNum, getGoodsIssueDocNums } from "./goods-issue.queries";

export {
  getGoodsIssues,
  getGoodsIssueByDocNum,
  getGoodsIssueDocNums,
  createGoodsIssue,
  updateGoodsIssue,
};

export const goodsIssueService = {
  getGoodsIssues,
  getGoodsIssueByDocNum,
  getGoodsIssueDocNums,
  createGoodsIssue,
  updateGoodsIssue,
};
