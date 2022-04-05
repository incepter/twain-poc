import { Layout, Menu, Button } from "antd";
import * as JSPM from "jsprintmanager";
import { ClearOutlined } from "@ant-design/icons";
import "antd/dist/antd.css"; // or 'antd/dist/antd.less'
import { useState } from "react";
import "./styles.css";

const { Header, Content } = Layout;

let scanner = window.scanner;

if (!scanner) {
  console.warn("scanner js not found!", scanner);
}

export default function App() {
  const [scanned, setScanned] = useState([]);

  return (
    <Layout>
      <Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
        <div className="logo" />
        <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["2"]}>
          <Menu.Item
            key="1"
            onClick={() => {
              document.getElementById("legacy").click();
            }}
          >
            Legacy -- File system
          </Menu.Item>
          <Menu.Item
            key="2"
            onClick={() => {
              scan((images) => setScanned((old) => [...old, ...images]));
            }}
          >
            Scanner.js
          </Menu.Item>
          <Menu.Item
            key="3"
            onClick={() => {
              scanJSPM((images) => setScanned((old) => [...old, ...images]));
            }}
          >
            JSPM
          </Menu.Item>
        </Menu>
      </Header>
      <Content
        className="site-layout"
        style={{
          padding: "0 50px",
          marginTop: 64,
          minHeight: "calc(100vh - 64px)"
        }}
      >
        {scanned.length ? (
          <Button
            type="primary"
            loading={false}
            className="clear"
            icon={<ClearOutlined />}
            onClick={() => setScanned([])}
          >
            Clear
          </Button>
        ) : null}
        <div style={{ width: "80%" }} id="images">
          {scanned.map((base64, i) => (
            <img className="scanned" alt={i} key={i} src={base64} />
          ))}
        </div>
        <input
          onChange={(e) => {
            const selectedFile = e.target.files[0];
            const reader = new FileReader();

            reader.onload = function (event) {
              setScanned((old) => [...old, event.target.result]);
            };

            reader.readAsDataURL(selectedFile);
          }}
          type="file"
          id="legacy"
          style={{ display: "none" }}
        />
      </Content>
    </Layout>
  );
}

var scanRequest = {
  twain_cap_setting: {
    ICAP_PIXELTYPE: "TWPT_RGB",
    ICAP_SUPPORPORTEDSIZES: "TWSS_USLESLETTER"
  },
  output_settings: [
    {
      type: "return-base64",
      format: "jpg"
    }
  ]
};

/** Triggers the scan */
function scan(cb) {
  scanner.scan(displayImagesOnPage.bind(null, cb), scanRequest);
}

/** Processes the scan result */
function displayImagesOnPage(cb, successful, mesg, response) {
  console.log("RESPONSE", { successful, mesg, response });
  if (!successful) {
    // On error
    console.warn("Failed: " + mesg);
    return;
  }
  if (
    successful &&
    mesg != null &&
    mesg.toLowerCase().indexOf("user cancel") >= 0
  ) {
    // User cancelled.
    console.info("User cancelled");
    return;
  }
  const scannedImages = scanner.getScannedImages(response, true, false); // returns an array of ScannedImage

  if (!scannedImages || !scannedImages.length) {
    return;
  }
  cb(scannedImages.map((t) => t.src));
}

let jspmDevice = null;

//JSPrintManager WebSocket settings
JSPM.JSPrintManager.auto_reconnect = true;
JSPM.JSPrintManager.start();
JSPM.JSPrintManager.WS.onStatusChanged = function () {
  if (jspmWSStatus()) {
    //get scanners
    JSPM.JSPrintManager.getScanners().then((devices) => {
      jspmDevice = devices[0];
    });
  }
};

//Check JSPM WebSocket status
function jspmWSStatus() {
  if (JSPM.JSPrintManager.websocket_status === JSPM.WSStatus.Open) return true;
  else if (JSPM.JSPrintManager.websocket_status === JSPM.WSStatus.Closed) {
    console.warn(
      "JSPrintManager (JSPM) is not installed or not running! Download JSPM Client App from https://neodynamic.com/downloads/jspm"
    );
    return false;
  } else if (JSPM.JSPrintManager.websocket_status === JSPM.WSStatus.Blocked) {
    alert("JSPM has blocked this website!");
    return false;
  }
}
function scanJSPM(cb) {
  if (jspmWSStatus()) {
    //create ClientScanJob
    var csj = new JSPM.ClientScanJob();
    //scanning settings
    csj.scannerName = jspmDevice;
    csj.pixelMode = JSPM.PixelMode["Color"];
    csj.resolution = 200;
    csj.imageFormat = JSPM.ScannerImageFormatOutput["JPG"];

    //get output image
    csj.onUpdate = (data, last) => {
      if (!(data instanceof Blob)) {
        console.info(data);
        return;
      }

      console.log(")=))>", data);
      var imgBlob = new Blob([data]);

      if (imgBlob.size === 0) return;

      const imgSrc = URL.createObjectURL(imgBlob, { type: "image/jpg" });
      cb([imgSrc]);
    };

    csj.onError = function (data, is_critical) {
      console.error(data);
    };

    //Send scan job to scanner!
    csj.sendToClient().then((data) => console.info(data));
  }
}
