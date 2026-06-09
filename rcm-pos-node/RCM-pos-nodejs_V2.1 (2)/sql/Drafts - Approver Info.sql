--To get a Draft# based on its Comments
SELECT T0."DocNum", T0."DocEntry"
    FROM ODRF T0
  WHERE T0."Comments" = 'Based on Stock Transfer Request #16413...'
  

--Get User's UserId
SELECT TOR."U_NAME", TOR."INTERNAL_K" FROM OUSR TOR WHERE TOR."U_NAME" = 'Theminda';

--Set OriginatorId for a Draft
UPDATE ODRF T0 SET T0."U_OriginatorId" = 
  WHERE T0."ObjType" = 1250000001
AND T0."DocEntry" IN (1002, 1003, 1006, 1011);

--Select Draft data
SELECT T0."U_OriginatorId", T0."U_DraftStatus", T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T0."CreateDate", T0."DocDate", T0."DocTime"
  FROM ODRF T0
WHERE T0."ObjType" = 1250000001
  AND T0."DocEntry" IN (1002, 1003, 1006, 1011);
  
--Get all Drafts for an Approver
SELECT T1."U_DocEntry", T1."U_DraftStatus", T0."U_DraftStatus" "ActualStatus", T0."ObjType",
 T0."U_OriginatorId", T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T0."CreateDate", T0."DocDate", T0."DocTime"
  FROM ODRF T0, "@APPROVALSTATUS" T1
WHERE T0."DocEntry" = T1."U_DocEntry"
  AND T1."U_DraftStatus" != 'NOT_ASSIGNED'
  AND T1."U_ApproverId" = 84
  AND T0."CreateDate" > TO_DATE('01/03/20', 'MM/DD/YY')
ORDER BY T0."ObjType" ASC
  --AND T0."ObjType" = 1250000001

--Get Approval Details for given Draft's DocEntry
SELECT * FROM "@APPROVALSTATUS" T1 WHERE 
T1."U_DocEntry" IN (1002, 1003, 1006, 1011, 1000, 1004, 1005, 1007, 1008, 1009, 1010, 1012, 1013, 1014, 1015, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024)

--selectStockTransDraftsWithMultiApprover
SELECT T0."DocEntry", T0."DocStatus", T0."DocDate", T0."DocTime", T0."Comments", T0."CreateDate",
T0."U_OriginatorId", TOR."U_NAME" as "Originator", T0."ToWhsCode",
T0."U_MultiLevelApproval", T0."U_NoOfApprovals", T1."U_ApprovalStatusId", T1."U_DocEntry", T1."U_ApproverId",
T0."U_DraftStatus", T1."U_ApprovalLevel", T1."U_RejectedReason", T0."U_TargetRecDocNum",
T0."U_Neo_ToBinLoc", T0."BPLName"
  FROM ODRF T0, OUSR TOR, "@APPROVALSTATUS" T1
WHERE T0."U_OriginatorId" = TOR."INTERNAL_K"
  AND T0."DocEntry" = T1."U_DocEntry"
  AND T1."U_DraftStatus" != 'NOT_ASSIGNED'
  AND T1."U_ApproverId" = 84
  AND T0."ObjType" = 1250000001
ORDER BY T0."DocEntry" ASC