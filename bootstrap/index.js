import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register the loader
register(new URL("./resolve.js", import.meta.url), pathToFileURL("./"));

// Has to be async or the loader will not apply
import("./build.js");
