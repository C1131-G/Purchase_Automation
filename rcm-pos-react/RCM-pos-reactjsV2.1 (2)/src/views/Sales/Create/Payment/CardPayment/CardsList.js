import React, { useState, useEffect } from "react";
import { Button, Container, Row, Col, Input } from "reactstrap";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "react-feather";

import { getCreditCards } from "../../../../../helper/credit-cards.js";
import CustomRadio from "components/CustomRadio/CustomRadio.js";
import { cardImageMap, creditCardTypes } from "../../../../../config/config.js";

const CardsList = (props) => {
  const [cardList, setCardList] = useState([]);
  const [selectedCard, setSelectedCard] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const handleSelection = (card) => {
    setSelectedCard(card);
    props.handleSelection(card);
  };

  const queryKey = "creditCardList";
  const recordListQuery = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      let records = await getCreditCards({ location: props.location });

      // get only the Cards (`Visa, Master, Amex, Debit`) & omit `Mpaisa`
      // records = records.filter(rec => rec.CompanyId === "FPOS");
      return records;
    },
    // Setting this to `false` will disable this query from automatically running
    enabled: true,
    staleTime: 1000 * 60 * 60, //time in milliseconds after which the data is considered stale
    refetchOnWindowFocus: false,
  });

  //componentDidUpdate - set the query results to state
  useEffect(() => {
    if (recordListQuery.status === "success") {
      setCardList(recordListQuery.data);
    }
  }, [recordListQuery.data]);

  useEffect(() => {
    if (recordListQuery.status === "error") {
      console.log("recordListQuery.error: ", JSON.stringify(recordListQuery.error));
      setWarningMsg(recordListQuery.error.message);
    }
  }, [recordListQuery.status]);

  const getImageSrc = (cardName) => {
    const matchedImage = Object.keys(cardImageMap).find((key) => cardName.includes(key));
    try {
      return require(`../../../../../assets/img/cards/${cardImageMap[matchedImage]}.jpg`);
    } catch (error) {
      console.error(`Image not found for card: ${cardImageMap[matchedImage]}`);
      return "";
    }
  };

  const selectedCardList = cardList
    .filter((card) => {
      if (selectedType === "ANZ") {
        return card.CardName.includes("ANZ");
      } else if (selectedType === "BSP") {
        return card.CardName.includes("BSP");
      } else if (selectedType === "WESTPAC") {
        return card.CardName.includes("WESTPAC");
      } else if (selectedType === "Others") {
        return (
          !card.CardName.includes("ANZ") &&
          !card.CardName.includes("BSP") &&
          !card.CardName.includes("WESTPAC")
        );
      }
      return null; // If no type is selected, return all cards
    })
    .sort((a, b) => a.CreditCard - b.CreditCard);

  // NOT Required. useQuery picks the props.location without this
  // useEffect(() => {
  //   recordListQuery.refetch();
  // }, [props.location]);

  return (
    <div className={props.className}>
      <h4>
        <b>EFTPOS</b>
      </h4>
      {/* Radio buttons for selecting card types */}
      <div className="tn-radio-con">
        {creditCardTypes
          ? creditCardTypes.map((type) => (
              <CustomRadio
                label={type}
                value={type}
                checked={selectedType === type}
                name={type}
                onChange={() => setSelectedType(type)}
                className="tn-radio-sm"
              />
            ))
          : ""}
      </div>
      {/* Display the filtered cards */}
      <Row className="mb-3">
        {recordListQuery.isFetching ? (
          <small className="text-primary">Loading...</small>
        ) : (
          selectedCardList.map((card) => (
            <Col key={card.CreditCard} className="text-center mb-4">
              {/* <Button
                color={selectedCard?.CreditCard === card.CreditCard ? "info" : "light"}
                onClick={() => handleSelection(card)}
                className="px-4 py-3 font-weight-700"
                size="lg"
              >
                {card.CardName}
              </Button> */}
              <Button
                className="p-0"
                color={selectedCard?.CreditCard === card.CreditCard ? "info" : "white"}
                onClick={() => handleSelection(card)}
                // className="px-4 py-3 font-weight-700"
                size="lg"
                style={{
                  borderRadius: "4px",
                  boxShadow: `${
                    selectedCard?.CreditCard === card.CreditCard
                      ? // ? "0 1px 8px rgb(6, 177, 186, 1)" //primary
                        "0 1px 10px rgb(94,114,228, 1)" //info
                      : // ? "0 1px 10px rgb(245,54,92, 1)" //danger
                        "0 4px 8px rgba(0, 0, 0, 0.3)"
                  }`, //dark
                  // width: "150px",
                  // height: "150px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  // src={require(`../../../../assets/img/cards/${card.CardName}.png`)}
                  src={getImageSrc(card.CardName)}
                  alt={card.CardName}
                  style={{ width: "110px", height: "auto", borderRadius: "4px" }}
                />
              </Button>
            </Col>
          ))
        )}
      </Row>
      {warningMsg && <small className="text-warning">{warningMsg}</small>}
    </div>
  );
};

export default CardsList;
