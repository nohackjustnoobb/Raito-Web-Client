import express from "express";
import cluster, { Worker } from "cluster";
import dotenv from "dotenv";
import path from "path";
import fetch from "node-fetch";
import chinese from "s2t-chinese";
import * as fs from "fs";

const port: number = 8080;
const cores = 4;

const start = () => {
  // Initialize the express engine
  const app: express.Application = express();

  app.use(express.static(path.join(__dirname, "public")));

  // Handling '/share' Request
  app.get("/share", async (req, res) => {
    const driver = req.query.driver as string | undefined;
    const id = req.query.id as string | undefined;

    // read the index.html
    const filePath = path.join(__dirname, "public/index.html");
    const data = fs.readFileSync(filePath, "utf8");

    try {
      if (!driver || !id) throw Error();

      const response = await fetch(
        `${process.env.REACT_APP_ADDRESS}details?${new URLSearchParams({
          driver: driver,
          ids: id,
          "show-all": "1",
        })}`
      );

      // check if success
      if (response.status !== 200) throw Error();

      // get request data
      const manga = (await response.json())[0];
      const title = chinese.s2t(manga.title);
      const thumbnail = manga.thumbnail;
      const description = chinese.s2t(manga.description);

      // generate the meta tag
      const metaTag = `<meta property="og:title" content="${title}"/><meta property="og:image" content="${thumbnail}"/><meta property="og:description" content="${description}"/><meta property="og:type" content="website" />`;

      // insert meta tag
      const startIndex = data.indexOf("</head>");
      res.send(
        data.substring(0, startIndex) + metaTag + data.substring(startIndex)
      );
    } catch (e) {
      // if error occured just send the unmodified html
      res.send(data);
    }
  });

  // Server setup
  app.listen(port);
};

if (cluster.isPrimary) {
  let dotenvPaths: Array<string> = [];

  if (process.env.NODE_ENV === "production") {
    dotenvPaths.push("../../.env.production.local", "../../.env.local");
  } else {
    dotenvPaths.push("../.env.development.local", "../.env.local");
  }

  dotenvPaths.forEach((location) =>
    dotenv.config({
      path: path.resolve(__dirname, location),
    })
  );

  console.log(process.env.REACT_APP_ADDRESS);

  console.log(`Total cores: ${cores}`);
  console.log(`Primary process ${process.pid} is running`);
  console.log(`Listening on ${port}`);

  for (let i = 0; i < cores; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker: Worker, code) => {
    console.log(`Worker ${worker.process.pid} exited with code ${code}`);
    console.log("Fork new worker!");
    cluster.fork();
  });
} else {
  start();
}
