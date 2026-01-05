import { SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tagsSorter: 'alpha',
    operationsSorter: 'method',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
    displayRequestDuration: true,
    syntaxHighlight: {
      activate: true,
      theme: 'agate',
    },
    requestSnippetsEnabled: true,
    requestSnippets: {
      generators: {
        curl_bash: {
          title: 'cURL (bash)',
          syntax: 'bash',
        },
        curl_powershell: {
          title: 'cURL (PowerShell)',
          syntax: 'powershell',
        },
      },
    },
  },
  customSiteTitle: 'Echo Social Media API Documentation',
  customfavIcon: '/favicon.ico',
  customCss: `
    .swagger-ui .topbar { 
      background-color: #1e293b; 
      padding: 10px 0; 
    }
    .swagger-ui .topbar-wrapper img { 
      content: url('https://via.placeholder.com/120x40/1e293b/ffffff?text=Echo+API');
      height: 40px;
    }
    .swagger-ui .info { 
      margin: 20px 0; 
    }
    .swagger-ui .opblock-tag { 
      font-size: 16px; 
      font-weight: 600; 
      margin: 10px 0; 
    }
    .swagger-ui .opblock { 
      border-radius: 5px; 
      margin-bottom: 10px; 
    }
    .swagger-ui .auth-btn-wrapper { 
      margin: 10px 0; 
    }
    .swagger-ui .scheme-container { 
      background: #f8f9fa; 
      padding: 10px; 
      border-radius: 5px; 
    }
  `,
};
