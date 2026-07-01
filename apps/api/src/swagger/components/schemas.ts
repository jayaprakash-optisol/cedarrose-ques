import type { OpenAPIV3 } from "../types.js";

export const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  Uuid: { type: "string", format: "uuid" },
  Email: { type: "string", format: "email" },
  DateTime: { type: "string", format: "date-time" },

  UserRole: {
    type: "string",
    enum: ["Researcher", "Reviewer", "Analyst", "Admin"],
  },
  UserStatus: {
    type: "string",
    enum: ["Active", "Inactive", "Pending"],
  },
  CaseStatus: {
    type: "string",
    enum: [
      "SENT",
      "OPENED",
      "IN PROGRESS",
      "COMPLETED",
      "COMPLETED — MISSING DATA",
      "PENDING CONTACT",
      "PENDING LINKAGE & CONTACT",
      "EXPIRED",
      "NOT SENT",
    ],
  },
  RecipientType: {
    type: "string",
    enum: ["Supplier", "Customer", "Partner", "Business Analytics Report"],
  },
  ResearcherDecision: {
    type: "string",
    enum: ["Approved", "Flagged", "Rejected"],
  },
  TemplateStatus: {
    type: "string",
    enum: ["Active", "Draft"],
  },
  AuditEventType: {
    type: "string",
    enum: [
      "API Call",
      "Link Event",
      "Authentication",
      "Form Activity",
      "Researcher Action",
      "API Push",
    ],
  },
  NotificationType: {
    type: "string",
    enum: ["submission", "expired", "blocked", "reminder", "review", "api"],
  },

  PaginationMeta: {
    type: "object",
    properties: {
      page: { type: "integer" },
      limit: { type: "integer" },
      total: { type: "integer" },
    },
  },

  ErrorBody: {
    type: "object",
    properties: {
      success: { type: "boolean", description: "Always false on error" },
      error: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          requestId: { type: "string" },
        },
      },
    },
  },

  User: {
    type: "object",
    properties: {
      userId: { $ref: "#/components/schemas/Uuid" },
      email: { $ref: "#/components/schemas/Email" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      role: { $ref: "#/components/schemas/UserRole" },
      status: { $ref: "#/components/schemas/UserStatus" },
      title: { type: "string", nullable: true },
      initials: { type: "string", nullable: true },
      totalReports: { type: "integer", nullable: true },
      score: { type: "string", nullable: true },
      createdAt: { $ref: "#/components/schemas/DateTime" },
      updatedAt: { $ref: "#/components/schemas/DateTime" },
      notifyOnSubmission: { type: "boolean" },
      notifyOnLinkExpiry: { type: "boolean" },
      notifyOnBlockedDispatch: { type: "boolean" },
      notifyOnRemindersSent: { type: "boolean" },
    },
  },

  UpdateMeRequest: {
    type: "object",
    properties: {
      firstName: { type: "string", minLength: 1, maxLength: 50 },
      lastName: { type: "string", maxLength: 50 },
      notifyOnSubmission: { type: "boolean" },
      notifyOnLinkExpiry: { type: "boolean" },
      notifyOnBlockedDispatch: { type: "boolean" },
      notifyOnRemindersSent: { type: "boolean" },
    },
  },

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { $ref: "#/components/schemas/Email" },
      password: { type: "string", minLength: 1 },
      rememberMe: { type: "boolean", default: false },
    },
    example: {
      email: "admin@cedarrose.local",
      password: "Password123",
      rememberMe: false,
    },
  },
  LoginResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string" },
          refreshToken: { type: "string" },
        },
      },
    },
  },
  ForgotPasswordRequest: {
    type: "object",
    required: ["email"],
    properties: { email: { $ref: "#/components/schemas/Email" } },
  },
  ResetPasswordRequest: {
    type: "object",
    required: ["token", "newPassword"],
    properties: {
      token: { type: "string" },
      newPassword: { type: "string", minLength: 8 },
    },
  },
  ChangePasswordRequest: {
    type: "object",
    required: ["currentPassword", "newPassword", "confirmPassword"],
    properties: {
      currentPassword: { type: "string" },
      newPassword: { type: "string", minLength: 8 },
      confirmPassword: { type: "string", minLength: 8 },
    },
  },
  CompleteRegistrationRequest: {
    type: "object",
    required: ["token", "password"],
    properties: {
      token: { type: "string" },
      password: { type: "string", minLength: 8 },
    },
  },

  Case: {
    type: "object",
    properties: {
      caseId: { $ref: "#/components/schemas/Uuid" },
      caseRef: { type: "string", example: "c-001" },
      orderId: { type: "string" },
      companyId: { $ref: "#/components/schemas/Uuid", nullable: true },
      subjectName: { type: "string" },
      country: { type: "string" },
      recipientType: { $ref: "#/components/schemas/RecipientType" },
      status: { $ref: "#/components/schemas/CaseStatus" },
      completionMandatory: { type: "integer" },
      completionOptional: { type: "integer" },
      analystId: { $ref: "#/components/schemas/Uuid", nullable: true },
      analystName: { type: "string", nullable: true, description: "First name of the analyst who sent the link" },
      company: {
        type: "object",
        nullable: true,
        properties: {
          companyName: { type: "string" },
          crisNumber: { type: "string" },
          country: { type: "string", nullable: true },
          riskRating: { type: "string", nullable: true },
          incorporationDate: { type: "string", nullable: true },
          legalStructure: { type: "string", nullable: true },
          primaryIndustry: { type: "string", nullable: true },
          recipientEmails: { type: "array", items: { $ref: "#/components/schemas/Email" } },
        },
      },
      assignedResearcherId: { $ref: "#/components/schemas/Uuid", nullable: true },
      researcherStatus: { type: "string", nullable: true },
      templateId: { $ref: "#/components/schemas/Uuid", nullable: true },
      linkExpiry: { $ref: "#/components/schemas/DateTime", nullable: true },
      createdAt: { $ref: "#/components/schemas/DateTime" },
    },
  },
  CreateCaseRequest: {
    type: "object",
    required: ["orderId", "subjectName", "country", "recipientType"],
    properties: {
      orderId: { type: "string", maxLength: 100 },
      uid: { type: "string", description: "CRiS company UID" },
      subjectName: { type: "string", maxLength: 255 },
      country: { type: "string", maxLength: 100 },
      recipientType: { $ref: "#/components/schemas/RecipientType" },
      recipientEmail: { $ref: "#/components/schemas/Email" },
      linkValidityHours: { type: "integer", minimum: 24, maximum: 72, default: 48 },
      templateId: { $ref: "#/components/schemas/Uuid" },
      analystId: { $ref: "#/components/schemas/Uuid" },
    },
  },
  ResearcherReviewRequest: {
    type: "object",
    required: ["decision"],
    properties: {
      decision: { $ref: "#/components/schemas/ResearcherDecision" },
      notes: { type: "string" },
    },
  },

  Company: {
    type: "object",
    properties: {
      companyId: { $ref: "#/components/schemas/Uuid" },
      companyName: { type: "string" },
      crisNumber: { type: "string", description: "CRiS UID" },
      country: { type: "string", nullable: true },
      riskRating: { type: "string", enum: ["Low", "Medium", "High"], nullable: true },
      legalStructure: { type: "string", nullable: true },
      primaryIndustry: { type: "string", nullable: true },
    },
  },
  CreateCompanyRequest: {
    type: "object",
    required: ["companyName", "crisNumber"],
    properties: {
      companyName: { type: "string", maxLength: 100 },
      crisNumber: { type: "string", maxLength: 50 },
      country: { type: "string" },
      riskRating: { type: "string", enum: ["Low", "Medium", "High"] },
      recipientEmails: { type: "array", items: { $ref: "#/components/schemas/Email" } },
    },
  },
  UpdateCompanyRequest: {
    type: "object",
    properties: {
      companyName: { type: "string" },
      country: { type: "string" },
      riskRating: { type: "string", enum: ["Low", "Medium", "High"] },
      legalStructure: { type: "string" },
      primaryIndustry: { type: "string" },
    },
  },

  AuditEvent: {
    type: "object",
    properties: {
      auditId: { $ref: "#/components/schemas/Uuid" },
      caseId: { $ref: "#/components/schemas/Uuid", nullable: true },
      eventType: { $ref: "#/components/schemas/AuditEventType" },
      description: { type: "string" },
      status: { type: "string", enum: ["Success", "Failed", "Pending"] },
      step: { type: "integer", minimum: 1, maximum: 15, nullable: true },
      createdAt: { $ref: "#/components/schemas/DateTime" },
    },
  },

  Notification: {
    type: "object",
    properties: {
      notificationId: { $ref: "#/components/schemas/Uuid" },
      userId: { $ref: "#/components/schemas/Uuid" },
      type: { $ref: "#/components/schemas/NotificationType" },
      title: { type: "string" },
      body: { type: "string" },
      read: { type: "boolean" },
      caseId: { $ref: "#/components/schemas/Uuid", nullable: true },
      createdAt: { $ref: "#/components/schemas/DateTime" },
    },
  },

  InviteUserRequest: {
    type: "object",
    required: ["firstName", "lastName", "email", "role"],
    properties: {
      firstName: { type: "string", maxLength: 50 },
      lastName: { type: "string", maxLength: 50 },
      email: { $ref: "#/components/schemas/Email" },
      role: { $ref: "#/components/schemas/UserRole" },
      platforms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: { type: "string", enum: ["automation", "questionnaire"] },
            role: { $ref: "#/components/schemas/UserRole" },
          },
        },
      },
    },
  },
  UpdateUserRequest: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      role: { $ref: "#/components/schemas/UserRole" },
      status: { $ref: "#/components/schemas/UserStatus" },
      title: { type: "string" },
      platforms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            platform: { type: "string", enum: ["automation", "questionnaire"] },
            role: { $ref: "#/components/schemas/UserRole" },
          },
        },
      },
    },
  },

  QuestionSchema: {
    type: "object",
    required: ["label", "fieldType"],
    properties: {
      label: { type: "string" },
      fieldType: { type: "string" },
      mandatory: { type: "boolean" },
      prefill: { type: "boolean" },
      options: { type: "array", items: { type: "string" } },
      orderIndex: { type: "integer" },
    },
  },
  SectionSchema: {
    type: "object",
    required: ["title", "orderIndex"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      banner: { type: "string" },
      orderIndex: { type: "integer" },
      questions: { type: "array", items: { $ref: "#/components/schemas/QuestionSchema" } },
    },
  },
  Template: {
    type: "object",
    properties: {
      templateId: { $ref: "#/components/schemas/Uuid" },
      name: { type: "string" },
      description: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/TemplateStatus" },
      recipientType: { type: "string", nullable: true },
      version: { type: "integer" },
      sections: { type: "array", items: { $ref: "#/components/schemas/SectionSchema" } },
    },
  },
  CreateTemplateRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      recipientType: { type: "string" },
      sections: { type: "array", items: { $ref: "#/components/schemas/SectionSchema" } },
    },
  },
  UpdateTemplateStatusRequest: {
    type: "object",
    required: ["status"],
    properties: { status: { $ref: "#/components/schemas/TemplateStatus" } },
  },

  PlatformConfig: {
    type: "object",
    properties: {
      configId: { $ref: "#/components/schemas/Uuid" },
      linkValidityDays: { type: "integer" },
      tokenType: { type: "string", enum: ["single-use", "time-based"] },
      otpLength: { type: "integer" },
      otpExpiryMinutes: { type: "integer" },
      reminder1Day: { type: "integer" },
      reminder2Day: { type: "integer" },
      reminderFinalDay: { type: "integer" },
      expiryDay: { type: "integer" },
      gamificationEnabled: { type: "boolean" },
      staleHours: { type: "integer" },
      auditRetentionDays: { type: "integer" },
    },
  },

  VerifyLinkRequest: {
    type: "object",
    required: ["token"],
    properties: { token: { type: "string", description: "Raw secure link token" } },
  },
  QuestionnaireAuthenticateRequest: {
    type: "object",
    required: ["token", "email"],
    properties: {
      token: { type: "string" },
      email: { $ref: "#/components/schemas/Email" },
    },
  },
  OtpVerifyRequest: {
    type: "object",
    required: ["token", "otp"],
    properties: {
      token: { type: "string" },
      otp: { type: "string", minLength: 4, maxLength: 8 },
    },
  },
  SaveProgressRequest: {
    type: "object",
    required: ["responses"],
    properties: {
      responses: {
        type: "array",
        items: {
          type: "object",
          required: ["question"],
          properties: {
            questionId: { $ref: "#/components/schemas/Uuid" },
            sectionId: { $ref: "#/components/schemas/Uuid" },
            question: { type: "string" },
            answer: { type: "string" },
            mandatory: { type: "boolean" },
          },
        },
      },
    },
  },

  Country: {
    type: "object",
    properties: {
      countryId: { type: "integer" },
      name: { type: "string" },
      code: { type: "string", nullable: true },
    },
  },

  HealthResponse: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          timestamp: { $ref: "#/components/schemas/DateTime" },
        },
      },
    },
  },
};
