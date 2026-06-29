/** Minimal OpenAPI 3 types (avoids adding @types/swagger-ui-express peer deps). */
export namespace OpenAPIV3 {
  export interface Document {
    openapi: string;
    info: InfoObject;
    servers?: ServerObject[];
    paths: PathsObject;
    components?: ComponentsObject;
    tags?: TagObject[];
  }

  export interface InfoObject {
    title: string;
    version: string;
    description?: string;
    contact?: { name?: string; email?: string };
  }

  export interface ServerObject {
    url: string;
    description?: string;
  }

  export type PathsObject = Record<string, PathItemObject | undefined>;

  export interface PathItemObject {
    get?: OperationObject;
    post?: OperationObject;
    put?: OperationObject;
    patch?: OperationObject;
    delete?: OperationObject;
  }

  export interface OperationObject {
    tags?: string[];
    summary?: string;
    description?: string;
    operationId?: string;
    security?: SecurityRequirementObject[];
    parameters?: ParameterObject[];
    requestBody?: RequestBodyObject;
    responses: ResponsesObject;
  }

  export interface ParameterObject {
    name: string;
    in: "query" | "path" | "header" | "cookie";
    required?: boolean;
    description?: string;
    schema?: SchemaObject;
  }

  export interface RequestBodyObject {
    required?: boolean;
    content: Record<string, MediaTypeObject>;
  }

  export interface MediaTypeObject {
    schema: SchemaObject;
  }

  export type ResponsesObject = Record<string, ResponseObject>;

  export interface ResponseObject {
    description?: string;
    content?: Record<string, MediaTypeObject>;
    $ref?: string;
  }

  export interface ComponentsObject {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecuritySchemeObject>;
    responses?: Record<string, ResponseObject>;
    parameters?: Record<string, ParameterObject>;
  }

  export interface TagObject {
    name: string;
    description?: string;
  }

  export type SchemaObject = {
    type?: string;
    format?: string;
    enum?: string[];
    items?: SchemaObject;
    properties?: Record<string, SchemaObject>;
    required?: string[];
    additionalProperties?: boolean | SchemaObject;
    nullable?: boolean;
    description?: string;
    default?: unknown;
    example?: unknown;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    $ref?: string;
    allOf?: SchemaObject[];
  };

  export interface SecuritySchemeObject {
    type: "http" | "apiKey" | "oauth2" | "openIdConnect";
    scheme?: string;
    bearerFormat?: string;
    description?: string;
    name?: string;
    in?: string;
  }

  export type SecurityRequirementObject = Record<string, string[]>;
}
