import mock from "../mock";

const value = [
  {
    EmpCode: 2233,
    Username: "prabhur",
    FirstName: "Prabhu",
    LastName: "Rathnavel",
    Mobile: "99xxxxxx",
    Email: "test@ltl.com",
    Status: "Active",
    Role: "1",
  },
  {
    EmpCode: 3344,
    Username: "arunp",
    FirstName: "Arun",
    LastName: "Prabakar",
    Mobile: "88xxxxxx",
    Email: "test2@ltl.com",
    Status: "Inactive",
    Role: "1",
  },
  {
    EmpCode: 4455,
    Username: "anishs",
    FirstName: "Anish",
    LastName: "Sam",
    Mobile: "77xxxxxx",
    Email: "test3@ltl.com",
    Status: "Active",
    Role: "0",
  },
  {
    EmpCode: 6677,
    Username: "senthilk",
    FirstName: "Senthil",
    LastName: "Kumar",
    Mobile: "66xxxxxx",
    Email: "test4@ltl.com",
    Status: "Active",
    Role: "1",
  },
  {
    EmpCode: 8899,
    Username: "ramesh",
    FirstName: "Ramesh",
    LastName: "R",
    Mobile: "55xxxxxx",
    Email: "test5@ltl.com",
    Status: "Inactive",
    Role: "0",
  },
];

mock.onGet("/api/Users").reply(200, {
  value,
});
