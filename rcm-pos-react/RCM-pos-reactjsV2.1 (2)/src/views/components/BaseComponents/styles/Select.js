// Sets the style for the dropdown list
export const optionsStyle = {
  option: (styles, state) => ({
    ...styles,
    color: state.isSelected ? "#484848" : styles.color,
    backgroundColor: state.isSelected ? "white" : styles.color,
    // borderBottom: "0.5px solid rgba(0, 0, 0, 0.125)",
    "&:hover": {
      color: "#484848",
      backgroundColor: "#F0F0F0",
    },
  }),
};

// Sets the <Input> size as "sm"
export const smSizeStyles = {
  control: (provided, state) => ({
    ...provided,
    background: "white",
    // borderColor: "#cad1d7", //DIDN't Work
    border: state.isFocused ? "1.5px solid #cad1d7" : "1.5px solid #cad1d7",
    minHeight: "30px",
    // height: "30px",
    boxShadow: state.isFocused ? null : null,
    borderColor: "none",
    "&:hover": {
      color: "#E40134",
    },
  }),
  singleValue: (provided, state) => ({
    ...provided,
    opacity: 0.6,
    fontSize: "0.875rem",
    paddingBottom: "1px",
    // color: "#484848",
  }),
  placeholder: (provided, state) => ({
    ...provided,
    paddingBottom: "2px",
    opacity: 0.65,
  }),
  valueContainer: (provided, state) => ({
    ...provided,
    // height: "30px",
    // Added for the container to grow its height based on the no. of options selected when mutli-select is enabled
    minHeight: "30px",
    padding: "0 6px",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  input: (provided, state) => ({
    ...provided,
    margin: "0px",
  }),
  indicatorSeparator: (state) => ({
    display: "none",
  }),
  indicatorsContainer: (provided, state) => ({
    ...provided,
    height: "30px",
    minHeight: "30px",
    // color: "#484848", //DIDNT work
  }),
};

export const smSizeClassNames = {
  control: (state) => (state.isFocused ? "text-muted text-sm" : "text-muted text-sm"),
  menu: (state) => (state.options ? "text-sm" : "text-sm"),
};
