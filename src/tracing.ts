import tracer from "dd-trace";

tracer.init({
  hostname: "datadog", // TODO: use environement variable instead ?
  logInjection: true, // TODO: use environement variable instead ?
  port: 8126, // TODO: use environement variable instead ?
});

export default tracer;
