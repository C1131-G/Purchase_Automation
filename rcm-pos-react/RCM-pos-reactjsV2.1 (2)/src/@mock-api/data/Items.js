import mock from "../mock";

//2004211:
const itemsList = {
  value: [
    {
      LineNum: 0,
      ItemCode: 2211,
      ItemDescription: "2 Charges for Making & Painting of Chairs",
      Quantity: 200,
      ItemType: "Batch",
      UOM: "Kg",
      U_WhsCode: "W1",
    },
    {
      LineNum: 1,
      ItemCode: 4428,
      ItemDescription: "4 Seal for - Received On",
      Quantity: 400,
      ItemType: "SerialNo",
      UOM: "Kg",
      U_WhsCode: "W1",
    },
    {
      LineNum: 2,
      ItemCode: 6428,
      ItemDescription:
        "6 BS 7671;2018 Requirements for Electrical Installations, IET Wiring Regulations",
      Quantity: 600,
      ItemType: "Batch",
      UOM: "Kg",
      U_WhsCode: "W1",
    },
    {
      LineNum: 3,
      ItemCode: 8211,
      ItemDescription: "8 Test Charges for Making Chairs",
      Quantity: 800,
      ItemType: "",
      UOM: "Lt",
      U_WhsCode: "W2",
    },
    {
      LineNum: 4,
      ItemCode: 10428,
      ItemDescription: "10 Test Seal for - Received On",
      Quantity: 1000,
      ItemType: "Batch",
      UOM: "Lt",
      U_WhsCode: "W2",
    },
    {
      LineNum: 5,
      ItemCode: 12428,
      ItemDescription: "12 Test BS 2020 Requirements for IET Wiring Regulations",
      Quantity: 1200,
      ItemType: "",
      UOM: "Lt",
      U_WhsCode: "W2",
    },
    {
      LineNum: 6,
      ItemCode: 12211,
      ItemDescription: "2 Charges for Making & Painting of Chairs",
      Quantity: 210,
      ItemType: "Batch",
      UOM: "Kg",
      U_WhsCode: "W1",
    },
    {
      LineNum: 7,
      ItemCode: 14428,
      ItemDescription: "4 Seal for - Received On",
      Quantity: 410,
      ItemType: "SerialNo",
      UOM: "Kg",
      U_WhsCode: "W2",
    },
    {
      LineNum: 8,
      ItemCode: 16428,
      ItemDescription:
        "6 BS 7671;2018 Requirements for Electrical Installations, IET Wiring Regulations",
      Quantity: 610,
      ItemType: "SerialNo",
      UOM: "Kg",
      U_WhsCode: "W2",
    },
    {
      LineNum: 9,
      ItemCode: 18211,
      ItemDescription: "8 Test Charges for Making Chairs",
      Quantity: 810,
      ItemType: "",
      UOM: "Lt",
      U_WhsCode: "W2",
    },
  ],
};

/*mock.onGet("/api/Items", {params: {purchaseOrder: '0000'}}).reply(config => {
	//if (config.params.purchaseOrder) {
		console.log("config.params.purchaseOrder: "+ config.params.purchaseOrder);
		return [200];
	//}
	//else {
	//	return [400];
	//}
});*/
mock.onGet("/api/Items").reply(200, {
  itemsList,
});
