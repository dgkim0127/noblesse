import cors from "cors";
import express from "express";
import { getEnv } from "./config/env.js";
import { createFirebaseTokenVerifier } from "./auth/firebaseAuth.js";
import { createRequireAdmin } from "./auth/requireAdmin.js";
import { createPostgresViewerLoader, createRequireFirebaseIdentity, createRequireUser } from "./auth/requireUser.js";
import { createPool } from "./db/pool.js";
import { createAdminBuyerQueries } from "./db/queries/adminBuyerQueries.js";
import { createAdminAccessQueries } from "./db/queries/adminAccessQueries.js";
import { createAdminAnalyticsQueries } from "./db/queries/adminAnalyticsQueries.js";
import { createAdminCategoryQueries } from "./db/queries/adminCategoryQueries.js";
import { createAdminDashboardQueries } from "./db/queries/adminDashboardQueries.js";
import { createAdminInquiryQueries } from "./db/queries/adminInquiryQueries.js";
import { createAdminFxQueries } from "./db/queries/adminFxQueries.js";
import { createAdminPriceQueries } from "./db/queries/adminPriceQueries.js";
import { createAdminProductQueries } from "./db/queries/adminProductQueries.js";
import { createAdminQuoteQueries } from "./db/queries/adminQuoteQueries.js";
import { createBuyerInquiryQueries } from "./db/queries/buyerInquiryQueries.js";
import { createBuyerQuoteQueries } from "./db/queries/buyerQuoteQueries.js";
import { createBuyerRegistrationQueries } from "./db/queries/buyerRegistrationQueries.js";
import { createLoginIdentifierQueries } from "./db/queries/loginIdentifierQueries.js";
import { createHomeShowcaseQueries } from "./db/queries/homeShowcaseQueries.js";
import * as catalogQueries from "./db/queries/catalogQueries.js";
import * as buyerQueries from "./db/queries/buyerQueries.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import { createAdminRoutes } from "./routes/adminRoutes.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createBuyerRoutes } from "./routes/buyerRoutes.js";
import { createCatalogRoutes } from "./routes/catalogRoutes.js";
import { createHealthRoutes } from "./routes/healthRoutes.js";
import { createAdminBuyerService } from "./services/adminBuyerService.js";
import { createAdminAccessService } from "./services/adminAccessService.js";
import { createAdminAnalyticsService } from "./services/adminAnalyticsService.js";
import { createAdminCategoryService } from "./services/adminCategoryService.js";
import { createAdminDashboardService } from "./services/adminDashboardService.js";
import { createAdminInquiryService } from "./services/adminInquiryService.js";
import { createAdminHomeShowcaseService } from "./services/adminHomeShowcaseService.js";
import { createAdminFxService } from "./services/adminFxService.js";
import { createAdminPriceService } from "./services/adminPriceService.js";
import { createAdminProductService } from "./services/adminProductService.js";
import {
  createAdminProductImageService,
  createFirebaseImageObjectStore,
  decodeMediaKey
} from "./services/adminProductImageService.js";
import { createAdminQuoteService } from "./services/adminQuoteService.js";
import { createBuyerInquiryService } from "./services/buyerInquiryService.js";
import { createBuyerQuoteService } from "./services/buyerQuoteService.js";
import { createBuyerRegistrationService } from "./services/buyerRegistrationService.js";
import { createBuyerService } from "./services/buyerService.js";
import { createCatalogService } from "./services/catalogService.js";
import { createLoginIdentifierService } from "./services/loginIdentifierService.js";
import { createHomeShowcaseService } from "./services/homeShowcaseService.js";

function buildCorsOptions(env) {
  if (!env.allowedOrigins.length) {
    return { origin: true };
  }
  return { origin: env.allowedOrigins };
}

export function createApp(options = {}) {
  const env = options.env || getEnv();
  const pool = options.pool ?? createPool(env);
  const adminAccessQueries =
    options.queries?.admin?.access || createAdminAccessQueries(pool);
  const imageObjectStore =
    options.objectStore || createFirebaseImageObjectStore(env);
  const mediaService =
    options.services?.media || {
      createReadStream(mediaKey) {
        return imageObjectStore.createReadStream(decodeMediaKey(mediaKey));
      }
    };
  const adminFxService =
    options.services?.admin?.fx ||
    createAdminFxService({
      queries: options.queries?.admin?.fx || createAdminFxQueries(pool)
    });
  const adminPriceService =
    options.services?.admin?.prices ||
    createAdminPriceService({
      queries: options.queries?.admin?.prices || createAdminPriceQueries(pool),
      fxService: adminFxService
    });
  const homeShowcaseQueries =
    options.queries?.homeShowcase || createHomeShowcaseQueries(pool);
  const homeShowcaseService =
    options.services?.homeShowcase || createHomeShowcaseService({ queries: homeShowcaseQueries });
  const services = {
    catalog:
      options.services?.catalog ||
      createCatalogService({
        pool,
        queries: options.queries?.catalog || catalogQueries
      }),
    buyer: options.services?.buyer || createBuyerService(),
    buyerRegistration:
      options.services?.buyerRegistration ||
      createBuyerRegistrationService({
        queries:
          options.queries?.buyerRegistration || createBuyerRegistrationQueries(pool)
      }),
    buyerInquiries:
      options.services?.buyerInquiries ||
      createBuyerInquiryService({
        queries: options.queries?.buyerInquiries || createBuyerInquiryQueries(pool)
      }),
    buyerQuotes:
      options.services?.buyerQuotes ||
      createBuyerQuoteService({
        queries: options.queries?.buyerQuotes || createBuyerQuoteQueries(pool),
        objectStore: imageObjectStore
      }),
    auth:
      options.services?.auth ||
      createLoginIdentifierService({
        queries: options.queries?.auth || createLoginIdentifierQueries(pool)
      }),
    homeShowcase: homeShowcaseService,
    admin: {
      access:
        options.services?.admin?.access ||
        createAdminAccessService({
          queries: adminAccessQueries
        }),
      dashboard:
        options.services?.admin?.dashboard ||
        createAdminDashboardService({
          queries:
            options.queries?.admin?.dashboard || createAdminDashboardQueries(pool)
        }),
      analytics:
        options.services?.admin?.analytics ||
        createAdminAnalyticsService({
          queries:
            options.queries?.admin?.analytics || createAdminAnalyticsQueries(pool)
        }),
      inquiries:
        options.services?.admin?.inquiries ||
        createAdminInquiryService({
          queries: options.queries?.admin?.inquiries || createAdminInquiryQueries(pool)
        }),
      buyers:
        options.services?.admin?.buyers ||
        createAdminBuyerService({
          queries: options.queries?.admin?.buyers || createAdminBuyerQueries(pool)
        }),
      categories:
        options.services?.admin?.categories ||
        createAdminCategoryService({
          queries: options.queries?.admin?.categories || createAdminCategoryQueries(pool)
        }),
      homeShowcase:
        options.services?.admin?.homeShowcase ||
        createAdminHomeShowcaseService({
          queries: homeShowcaseQueries,
          objectStore: imageObjectStore
        }),
      prices:
        adminPriceService,
      fx:
        adminFxService,
      products:
        options.services?.admin?.products ||
        createAdminProductService({
          queries: options.queries?.admin?.products || createAdminProductQueries(pool),
          imageService:
            options.services?.admin?.productImages ||
            createAdminProductImageService({
              queries: options.queries?.admin?.products || createAdminProductQueries(pool),
              objectStore: imageObjectStore
            })
        }),
      quotes:
        options.services?.admin?.quotes ||
        createAdminQuoteService({
          queries: options.queries?.admin?.quotes || createAdminQuoteQueries(pool),
          objectStore: imageObjectStore
        })
    }
  };

  const verifier = options.auth?.verifier || createFirebaseTokenVerifier(env);
  const loadViewer =
    options.auth?.loadViewer ||
    createPostgresViewerLoader({
      pool,
      queries: options.queries?.buyer || buyerQueries
    });
  const requireUser = options.auth?.requireUser || createRequireUser({ verifier, loadViewer });
  const requireFirebaseIdentity =
    options.auth?.requireFirebaseIdentity || createRequireFirebaseIdentity({ verifier });
  const loadAdminUserByAuthUid =
    options.auth?.loadAdminUserByAuthUid ||
    ((authUid) => adminAccessQueries.getAdminUserByAuthUid(authUid));
  const requireAdmin =
    options.auth?.requireAdmin ||
    createRequireAdmin({
      verifier: options.auth?.adminVerifier || verifier,
      loadAdminUserByAuthUid
    });

  const app = express();

  app.use(requestId);
  app.use(cors(buildCorsOptions(env)));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/health", createHealthRoutes());
  app.use("/api/auth", createAuthRoutes({ loginIdentifierService: services.auth }));
  app.use(
    "/api/catalog",
    createCatalogRoutes({
      catalogService: services.catalog,
      homeShowcaseService: services.homeShowcase,
      mediaService
    })
  );
  app.use(
    "/api/buyer",
    createBuyerRoutes({
      buyerService: services.buyer,
      buyerRegistrationService: services.buyerRegistration,
      buyerInquiryService: services.buyerInquiries,
      buyerQuoteService: services.buyerQuotes,
      requireFirebaseIdentity,
      requireUser
    })
  );
  app.use(
    "/api/admin",
    createAdminRoutes({
      services: services.admin,
      requireAdmin
    })
  );

  app.use(errorHandler);

  return app;
}
