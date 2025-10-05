import tracer from "dd-trace";
import { config } from "./config/index.ts";

tracer.init({
  hostname: config.DD_TRACE_AGENT_HOSTNAME,
  logInjection: config.DD_TRACE_LOG_INJECTION,
  port: config.DD_TRACE_AGENT_PORT,
});

export default tracer;
