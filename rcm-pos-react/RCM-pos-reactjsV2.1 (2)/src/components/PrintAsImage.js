import React, { useCallback, useRef } from "react";
import { toJpeg, toPng } from "html-to-image";

const PrintAsImage = (props) => {
  const ref = useRef(null);

  const handlePrint = useCallback(() => {
    if (ref.current === null) {
      return;
    }

    toJpeg(ref.current, { cacheBust: true })
      .then((dataUrl) => {
        /*const link = document.createElement('a')
        link.download = 'my-image-name.png'
        link.href = dataUrl
        link.click()
        */
        //window.open(dataUrl, '_blank');

        /* #1
        const myWindow = window.open("about:blank");
        let image = new Image();
        image.src = dataUrl;
        setTimeout(function(){
          myWindow.document.write(image.outerHTML);
        }, 0);
        */

        const myWindow = window.open(dataUrl, "_blank");
        myWindow.focus();
        myWindow.print();
        myWindow.close();
      })
      .catch((err) => {
        console.log(err);
      });
  }, [ref]);

  return (
    <>
      <div ref={ref}>{props.content.outerHTML}</div>
      <button onClick={handlePrint}>Print</button>
    </>
  );
};

export default PrintAsImage;
