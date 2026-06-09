import mock from "../mock";

const value = [
  {
    U_WhsCode: "W1",
    WHSName: "Warehouse1",
    DefaultBin: "B1",
  },
  {
    U_WhsCode: "W2",
    WHSName: "Warehouse2",
    DefaultBin: "B2",
  },
];

mock.onGet("/api/Warehouse").reply(200, {
  value,
});
