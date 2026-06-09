import mock from "../mock";

const value = [
  {
    BinCode: "B1",
    BinName: "Bin1",
  },
  {
    BinCode: "B2",
    BinName: "Bin2",
  },
  {
    BinCode: "B3",
    BinName: "Bin3",
  },
  {
    BinCode: "B4",
    BinName: "Bin4",
  },
];

mock.onGet("/api/BinLocation").reply(200, {
  value,
});
