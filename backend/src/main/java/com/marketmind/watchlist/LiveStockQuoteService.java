package com.marketmind.watchlist;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LiveStockQuoteService {

    private static final Logger log = LoggerFactory.getLogger(LiveStockQuoteService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Map<String, CachedQuote> quoteCache = new ConcurrentHashMap<>();
    private final Map<String, FallbackStockInfo> directory = new ConcurrentHashMap<>();

    // Flagship core symbols supported by the MarketMind AI Sentiment & Causal Engine (our USP: SBI, TCS, HDFC, NIFTY)
    private static final Set<String> CORE_USP_SYMBOLS = Set.of(
            "SBIN", "SBI", "TCS", "HDFCBANK", "HDFC", "NIFTY", "NIFTY50", "NIFTYBANK"
    );

    public record StockQuote(
            String symbol,
            String name,
            Double price,
            Double change,
            Double changePercent,
            Double dayHigh,
            Double dayLow,
            Long volume,
            String sector,
            boolean hasSentimentUsp
    ) {}

    private record CachedQuote(StockQuote quote, Instant timestamp) {}

    public record FallbackStockInfo(String symbol, String name, double basePrice, String sector, boolean hasSentimentUsp) {}

    public LiveStockQuoteService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
        initDirectory();
    }

    private void initDirectory() {
        // Flagship Core USP Stocks (SBI, TCS, HDFC, NIFTY)
        registerStock("SBIN", "State Bank of India", 814.50, "Banking & Financial Services", true);
        registerStock("TCS", "Tata Consultancy Services Ltd", 2342.70, "Information Technology", true);
        registerStock("HDFCBANK", "HDFC Bank Limited", 1748.20, "Banking & Financial Services", true);
        registerStock("NIFTY", "Nifty 50 Benchmark Index", 24420.00, "Benchmark Index", true);
        registerStock("NIFTYBANK", "Nifty Bank Index", 52470.80, "Banking & Financial Services", true);

        // Broad Universe of Indian Equities (All Stocks with Live Data Pull)
        // 1. Banking & Financial Services
        registerStock("RELIANCE", "Reliance Industries Limited", 1285.40, "Energy & Conglomerate", false);
        registerStock("INFY", "Infosys Limited", 1091.90, "Information Technology", false);
        registerStock("ICICIBANK", "ICICI Bank Limited", 1608.90, "Banking & Financial Services", false);
        registerStock("KOTAKBANK", "Kotak Mahindra Bank Ltd", 1735.60, "Banking & Financial Services", false);
        registerStock("AXISBANK", "Axis Bank Limited", 1162.30, "Banking & Financial Services", false);
        registerStock("BAJFINANCE", "Bajaj Finance Limited", 6820.00, "Financial Services", false);
        registerStock("BAJAJFINSV", "Bajaj Finserv Limited", 1612.40, "Financial Services", false);
        registerStock("INDUSINDBK", "IndusInd Bank Limited", 1045.10, "Banking & Financial Services", false);
        registerStock("BANKBARODA", "Bank of Baroda", 248.50, "Banking & Financial Services", false);
        registerStock("PNB", "Punjab National Bank", 104.20, "Banking & Financial Services", false);
        registerStock("CANBK", "Canara Bank", 102.80, "Banking & Financial Services", false);
        registerStock("IDFCFIRSTB", "IDFC First Bank Ltd", 68.40, "Banking & Financial Services", false);
        registerStock("CHOLAFIN", "Cholamandalam Investment & Fin", 1240.00, "Financial Services", false);
        registerStock("MUTHOOTFIN", "Muthoot Finance Limited", 1890.50, "Financial Services", false);
        registerStock("SHRIRAMFIN", "Shriram Finance Limited", 3120.00, "Financial Services", false);
        registerStock("JIOFIN", "Jio Financial Services Ltd", 226.80, "Financial Services", false);
        registerStock("JIO", "Jio Financial Services Ltd", 226.80, "Financial Services", false);
        registerStock("HDFCLIFE", "HDFC Life Insurance Co Ltd", 678.50, "Insurance & Financials", false);
        registerStock("SBILIFE", "SBI Life Insurance Co Ltd", 1540.00, "Insurance & Financials", false);

        // 2. Information Technology
        registerStock("WIPRO", "Wipro Limited", 562.30, "Information Technology", false);
        registerStock("HCLTECH", "HCL Technologies Limited", 1824.50, "Information Technology", false);
        registerStock("TECHM", "Tech Mahindra Limited", 1680.00, "Information Technology", false);
        registerStock("LTIM", "LTIMindtree Limited", 5940.20, "Information Technology", false);
        registerStock("PERSISTENT", "Persistent Systems Limited", 5420.00, "Information Technology", false);
        registerStock("COFORGE", "Coforge Limited", 7850.00, "Information Technology", false);
        registerStock("TATAELXSI", "Tata Elxsi Limited", 6890.00, "Information Technology", false);
        registerStock("KPITTECH", "KPIT Technologies Limited", 1480.00, "Information Technology", false);

        // 3. Automobile & Mobility
        registerStock("TATAMOTORS", "Tata Motors Limited", 785.40, "Automobile", false);
        registerStock("MARUTI", "Maruti Suzuki India Ltd", 11240.00, "Automobile", false);
        registerStock("M&M", "Mahindra & Mahindra Ltd", 2890.50, "Automobile", false);
        registerStock("BAJAJ-AUTO", "Bajaj Auto Limited", 9450.00, "Automobile", false);
        registerStock("EICHERMOT", "Eicher Motors Limited", 4820.00, "Automobile", false);
        registerStock("HEROMOTOCO", "Hero MotoCorp Limited", 4720.00, "Automobile", false);
        registerStock("TVSMOTOR", "TVS Motor Company Ltd", 2420.00, "Automobile", false);
        registerStock("MOTHERSON", "Samvardhana Motherson Int", 168.50, "Auto Ancillary", false);
        registerStock("BHARATFORG", "Bharat Forge Limited", 1380.00, "Auto Ancillary", false);

        // 4. Consumer Goods, Retail & FMCG
        registerStock("ITC", "ITC Limited", 472.60, "Consumer Goods / FMCG", false);
        registerStock("HINDUNILVR", "Hindustan Unilever Ltd", 2430.80, "Consumer Goods / FMCG", false);
        registerStock("TITAN", "Titan Company Limited", 3280.00, "Consumer Discretionary", false);
        registerStock("NESTLEIND", "Nestle India Limited", 2290.00, "Consumer Goods / FMCG", false);
        registerStock("ASIANPAINT", "Asian Paints Limited", 2480.00, "Consumer Goods / Paints", false);
        registerStock("BRITANNIA", "Britannia Industries Ltd", 4980.00, "Consumer Goods / FMCG", false);
        registerStock("DABUR", "Dabur India Limited", 390.65, "Consumer Goods / FMCG", false);
        registerStock("COLPAL", "Colgate-Palmolive (India) Limited", 1776.60, "Consumer Goods / FMCG", false);
        registerStock("COLGATE", "Colgate-Palmolive (India) Limited", 1776.60, "Consumer Goods / FMCG", false);
        registerStock("GODREJCP", "Godrej Consumer Products", 1180.00, "Consumer Goods / FMCG", false);
        registerStock("MARICO", "Marico Limited", 645.00, "Consumer Goods / FMCG", false);
        registerStock("TATACONSUM", "Tata Consumer Products Ltd", 965.00, "Consumer Goods / FMCG", false);
        registerStock("VBL", "Varun Beverages Limited", 615.00, "Beverages & FMCG", false);
        registerStock("TRENT", "Trent Limited", 6420.00, "Retail & Consumer", false);
        registerStock("DMART", "Avenue Supermarts (DMart)", 3840.00, "Retail & Consumer", false);
        registerStock("ZOMATO", "Zomato Limited", 268.40, "Internet & Consumer Services", false);
        registerStock("NYKAA", "FSN E-Commerce (Nykaa)", 178.50, "Internet & E-Commerce", false);

        // 5. Energy, Power, Utilities & Oil
        registerStock("LT", "Larsen & Toubro Limited", 3560.00, "Capital Goods & Infrastructure", false);
        registerStock("BHARTIARTL", "Bharti Airtel Limited", 1580.40, "Telecommunications", false);
        registerStock("NTPC", "NTPC Limited", 382.50, "Power & Utilities", false);
        registerStock("POWERGRID", "Power Grid Corp of India", 318.20, "Power & Utilities", false);
        registerStock("ONGC", "Oil & Natural Gas Corp", 262.40, "Oil & Gas", false);
        registerStock("COALINDIA", "Coal India Limited", 425.00, "Mining & Energy", false);
        registerStock("IOC", "Indian Oil Corporation Ltd", 142.50, "Oil & Gas", false);
        registerStock("BPCL", "Bharat Petroleum Corp Ltd", 312.00, "Oil & Gas", false);
        registerStock("GAIL", "GAIL (India) Limited", 195.00, "Utilities & Natural Gas", false);
        registerStock("TATAPOWER", "Tata Power Company Ltd", 398.00, "Power & Utilities", false);
        registerStock("ADANIPOWER", "Adani Power Limited", 560.00, "Power & Utilities", false);
        registerStock("ADANIGREEN", "Adani Green Energy Ltd", 1520.00, "Renewable Energy", false);
        registerStock("IREDA", "Indian Renewable Energy Dev", 198.50, "Renewable Finance", false);
        registerStock("SUZLON", "Suzlon Energy Limited", 62.40, "Renewable Energy", false);

        // 6. Metals & Mining
        registerStock("TATASTEEL", "Tata Steel Limited", 148.60, "Metals & Mining", false);
        registerStock("JSWSTEEL", "JSW Steel Limited", 942.00, "Metals & Mining", false);
        registerStock("HINDALCO", "Hindalco Industries Ltd", 652.80, "Metals & Mining", false);
        registerStock("VEDL", "Vedanta Limited", 468.00, "Metals & Mining", false);
        registerStock("JINDALSTEL", "Jindal Steel & Power Ltd", 890.00, "Metals & Mining", false);
        registerStock("NMDC", "NMDC Limited", 228.00, "Metals & Mining", false);

        // 7. Pharmaceuticals & Healthcare
        registerStock("SUNPHARMA", "Sun Pharmaceutical Ind", 1780.20, "Healthcare & Pharma", false);
        registerStock("CIPLA", "Cipla Limited", 1520.00, "Healthcare & Pharma", false);
        registerStock("DRREDDY", "Dr. Reddy's Laboratories", 1240.00, "Healthcare & Pharma", false);
        registerStock("APOLLOHOSP", "Apollo Hospitals Enterprise", 6980.00, "Healthcare Services", false);
        registerStock("DIVISLAB", "Divi's Laboratories Ltd", 5840.00, "Healthcare & Pharma", false);
        registerStock("LUPIN", "Lupin Limited", 2120.00, "Healthcare & Pharma", false);
        registerStock("MANKIND", "Mankind Pharma Limited", 2580.00, "Healthcare & Pharma", false);
        registerStock("MAXHEALTH", "Max Healthcare Institute", 980.00, "Healthcare Services", false);

        // 8. Capital Goods, Defence & PSU Infrastructure
        registerStock("HAL", "Hindustan Aeronautics Ltd", 4320.00, "Aerospace & Defence", false);
        registerStock("BEL", "Bharat Electronics Ltd", 298.50, "Aerospace & Defence", false);
        registerStock("MAZDOCK", "Mazagon Dock Shipbuilders", 4120.00, "Aerospace & Defence", false);
        registerStock("BHEL", "Bharat Heavy Electricals", 238.00, "Capital Goods", false);
        registerStock("RVNL", "Rail Vikas Nigam Limited", 442.00, "Rail Infrastructure", false);
        registerStock("IRFC", "Indian Railway Finance Corp", 152.00, "Rail Infrastructure", false);
        registerStock("IRCTC", "Indian Railway Catering & Tourism", 825.00, "Rail & Tourism", false);
        registerStock("POLYCAB", "Polycab India Limited", 6780.00, "Cables & Electricals", false);

        // 9. Cement, Realty & Conglomerates
        registerStock("ADANIENT", "Adani Enterprises Limited", 2840.00, "Conglomerate", false);
        registerStock("ADANIPORTS", "Adani Ports & SEZ", 1180.00, "Infrastructure & Logistics", false);
        registerStock("ULTRACEMCO", "UltraTech Cement Limited", 11450.00, "Cement & Construction", false);
        registerStock("AMBUJACEM", "Ambuja Cements Limited", 552.00, "Cement & Construction", false);
        registerStock("GRASIM", "Grasim Industries Limited", 2640.00, "Conglomerate", false);
        registerStock("DLF", "DLF Limited", 812.00, "Real Estate", false);
        registerStock("GODREJPROP", "Godrej Properties Limited", 2890.00, "Real Estate", false);
        registerStock("PIDILITIND", "Pidilite Industries Limited", 2980.00, "Specialty Chemicals", false);
    }

    private void registerStock(String symbol, String name, double basePrice, String sector, boolean hasSentimentUsp) {
        directory.put(symbol.toUpperCase(), new FallbackStockInfo(symbol.toUpperCase(), name, basePrice, sector, hasSentimentUsp));
    }

    public boolean isCoreSentimentSupported(String symbol) {
        if (symbol == null) return false;
        return CORE_USP_SYMBOLS.contains(symbol.toUpperCase().trim());
    }

    public List<FallbackStockInfo> getStockDirectory(String search) {
        if (search == null || search.trim().isEmpty()) {
            return new ArrayList<>(directory.values());
        }
        String q = search.trim().toUpperCase();
        List<FallbackStockInfo> matches = new ArrayList<>(directory.values().stream()
                .filter(s -> s.symbol().contains(q) || s.name().toUpperCase().contains(q) || s.sector().toUpperCase().contains(q))
                .sorted((a, b) -> {
                    // USP stocks first, then exact symbol match
                    if (a.hasSentimentUsp() != b.hasSentimentUsp()) {
                        return a.hasSentimentUsp() ? -1 : 1;
                    }
                    boolean aStarts = a.symbol().startsWith(q);
                    boolean bStarts = b.symbol().startsWith(q);
                    if (aStarts != bStarts) return aStarts ? -1 : 1;
                    return a.symbol().compareTo(b.symbol());
                })
                .limit(25)
                .toList());

        // If user query is a ticker not in the pre-registered list, dynamically allow adding any NSE ticker!
        boolean exactMatch = matches.stream().anyMatch(m -> m.symbol().equalsIgnoreCase(q));
        if (!exactMatch && q.length() >= 2 && q.matches("^[A-Z0-9&\\-]+$")) {
            matches.add(0, new FallbackStockInfo(q, q + " (NSE Equities)", 0.0, "Indian Equities (NSE)", isCoreSentimentSupported(q)));
        }

        return matches;
    }

    public StockQuote getLiveQuote(String rawSymbol) {
        if (rawSymbol == null || rawSymbol.trim().isEmpty()) {
            return null;
        }

        String symbol = rawSymbol.toUpperCase().trim();
        boolean hasUsp = isCoreSentimentSupported(symbol);

        // Check cache (TTL 30 seconds)
        CachedQuote cached = quoteCache.get(symbol);
        if (cached != null && Duration.between(cached.timestamp(), Instant.now()).getSeconds() < 30) {
            return cached.quote();
        }

        // Try Yahoo Finance Live API
        StockQuote live = fetchFromYahooFinance(symbol, hasUsp);
        if (live != null) {
            quoteCache.put(symbol, new CachedQuote(live, Instant.now()));
            return live;
        }

        // Fallback to Directory or Generated Snapshot
        StockQuote fallback = generateFallbackQuote(symbol, hasUsp);
        quoteCache.put(symbol, new CachedQuote(fallback, Instant.now()));
        return fallback;
    }

    private StockQuote fetchFromYahooFinance(String symbol, boolean hasUsp) {
        String ticker = mapToYahooTicker(symbol);
        String[] hosts = {
                "https://query2.finance.yahoo.com/v8/finance/chart/",
                "https://query1.finance.yahoo.com/v8/finance/chart/"
        };

        for (String baseHost : hosts) {
            try {
                String url = baseHost + ticker;

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                        .timeout(Duration.ofSeconds(3))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
                    continue;
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode resultNode = root.path("chart").path("result");
                if (resultNode.isMissingNode() || !resultNode.isArray() || resultNode.isEmpty()) {
                    continue;
                }

                JsonNode meta = resultNode.get(0).path("meta");
                double price = meta.path("regularMarketPrice").asDouble(0.0);
                if (price <= 0.0) continue;

                double prevClose = meta.path("chartPreviousClose").asDouble(price);
                double changePercent = meta.path("regularMarketChangePercent").asDouble(
                        prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0.0
                );
                double change = price - prevClose;
                double dayHigh = meta.path("regularMarketDayHigh").asDouble(price * 1.01);
                double dayLow = meta.path("regularMarketDayLow").asDouble(price * 0.99);
                long volume = meta.path("regularMarketVolume").asLong(1500000L);

                String name = meta.path("longName").asText(meta.path("shortName").asText(symbol));
                FallbackStockInfo info = directory.get(symbol.toUpperCase().trim());
                String sector = info != null ? info.sector() : "Indian Equities (NSE)";

                return new StockQuote(
                        symbol,
                        name,
                        Math.round(price * 100.0) / 100.0,
                        Math.round(change * 100.0) / 100.0,
                        Math.round(changePercent * 100.0) / 100.0,
                        Math.round(dayHigh * 100.0) / 100.0,
                        Math.round(dayLow * 100.0) / 100.0,
                        volume,
                        sector,
                        hasUsp
                );
            } catch (Exception e) {
                log.debug("Live quote lookup via {} for {} skipped: {}", baseHost, ticker, e.getMessage());
            }
        }
        return null;
    }

    private String mapToYahooTicker(String symbol) {
        String s = symbol.toUpperCase().trim();
        if (s.equals("NIFTYBANK")) return "^NSEBANK";
        if (s.equals("NIFTY") || s.equals("NIFTY50")) return "^NSEI";
        if (s.equals("SBI")) return "SBIN.NS";
        if (s.equals("HDFC")) return "HDFCBANK.NS";
        if (s.equals("COLGATE")) return "COLPAL.NS";
        if (s.equals("JIO")) return "JIOFIN.NS";
        if (s.equals("AIRTEL")) return "BHARTIARTL.NS";
        if (s.equals("LARSEN") || s.equals("L&T")) return "LT.NS";
        if (s.equals("MAHINDRA")) return "M&M.NS";
        if (s.endsWith(".NS") || s.endsWith(".BO")) return s;
        return s + ".NS";
    }

    private StockQuote generateFallbackQuote(String symbol, boolean hasUsp) {
        String s = symbol.toUpperCase().trim();
        FallbackStockInfo info = directory.get(s);
        int hash = Math.abs(s.hashCode());
        double base = info != null ? info.basePrice() : 250.0 + (hash % 2800);
        String name = info != null ? info.name() : s + " (NSE)";
        String sector = info != null ? info.sector() : "Indian Equities (NSE)";

        double pctChg = ((hash % 50) - 25) / 10.0; // between -2.5% and +2.5%
        double price = base * (1.0 + pctChg / 100.0);
        double change = price - base;

        return new StockQuote(
                symbol,
                name,
                Math.round(price * 100.0) / 100.0,
                Math.round(change * 100.0) / 100.0,
                Math.round(pctChg * 100.0) / 100.0,
                Math.round(price * 1.012 * 100.0) / 100.0,
                Math.round(price * 0.988 * 100.0) / 100.0,
                1500000L + (hash % 8500000),
                sector,
                hasUsp
        );
    }
}
