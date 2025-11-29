from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

from app.schemas import ApiResponse

router = APIRouter()

# Comprehensive list of world currencies with their details
CURRENCIES = [
    {"code": "USD", "name": "United States Dollar", "symbol": "$", "country": "United States"},
    {"code": "EUR", "name": "Euro", "symbol": "€", "country": "European Union"},
    {"code": "GBP", "name": "British Pound Sterling", "symbol": "£", "country": "United Kingdom"},
    {"code": "JPY", "name": "Japanese Yen", "symbol": "¥", "country": "Japan"},
    {"code": "CHF", "name": "Swiss Franc", "symbol": "CHF", "country": "Switzerland"},
    {"code": "CAD", "name": "Canadian Dollar", "symbol": "C$", "country": "Canada"},
    {"code": "AUD", "name": "Australian Dollar", "symbol": "A$", "country": "Australia"},
    {"code": "NZD", "name": "New Zealand Dollar", "symbol": "NZ$", "country": "New Zealand"},
    {"code": "CNY", "name": "Chinese Yuan", "symbol": "¥", "country": "China"},
    {"code": "INR", "name": "Indian Rupee", "symbol": "₹", "country": "India"},
    {"code": "SGD", "name": "Singapore Dollar", "symbol": "S$", "country": "Singapore"},
    {"code": "HKD", "name": "Hong Kong Dollar", "symbol": "HK$", "country": "Hong Kong"},
    {"code": "KRW", "name": "South Korean Won", "symbol": "₩", "country": "South Korea"},
    {"code": "SEK", "name": "Swedish Krona", "symbol": "kr", "country": "Sweden"},
    {"code": "NOK", "name": "Norwegian Krone", "symbol": "kr", "country": "Norway"},
    {"code": "DKK", "name": "Danish Krone", "symbol": "kr", "country": "Denmark"},
    {"code": "ZAR", "name": "South African Rand", "symbol": "R", "country": "South Africa"},
    {"code": "BRL", "name": "Brazilian Real", "symbol": "R$", "country": "Brazil"},
    {"code": "MXN", "name": "Mexican Peso", "symbol": "Mex$", "country": "Mexico"},
    {"code": "RUB", "name": "Russian Ruble", "symbol": "₽", "country": "Russia"},
    {"code": "TRY", "name": "Turkish Lira", "symbol": "₺", "country": "Turkey"},
    {"code": "PLN", "name": "Polish Zloty", "symbol": "zł", "country": "Poland"},
    {"code": "THB", "name": "Thai Baht", "symbol": "฿", "country": "Thailand"},
    {"code": "IDR", "name": "Indonesian Rupiah", "symbol": "Rp", "country": "Indonesia"},
    {"code": "MYR", "name": "Malaysian Ringgit", "symbol": "RM", "country": "Malaysia"},
    {"code": "PHP", "name": "Philippine Peso", "symbol": "₱", "country": "Philippines"},
    {"code": "CZK", "name": "Czech Koruna", "symbol": "Kč", "country": "Czech Republic"},
    {"code": "HUF", "name": "Hungarian Forint", "symbol": "Ft", "country": "Hungary"},
    {"code": "ILS", "name": "Israeli New Shekel", "symbol": "₪", "country": "Israel"},
    {"code": "CLP", "name": "Chilean Peso", "symbol": "CLP$", "country": "Chile"},
    {"code": "AED", "name": "UAE Dirham", "symbol": "د.إ", "country": "United Arab Emirates"},
    {"code": "SAR", "name": "Saudi Riyal", "symbol": "﷼", "country": "Saudi Arabia"},
    {"code": "QAR", "name": "Qatari Riyal", "symbol": "﷼", "country": "Qatar"},
    {"code": "KWD", "name": "Kuwaiti Dinar", "symbol": "د.ك", "country": "Kuwait"},
    {"code": "BHD", "name": "Bahraini Dinar", "symbol": "د.ب", "country": "Bahrain"},
    {"code": "OMR", "name": "Omani Rial", "symbol": "﷼", "country": "Oman"},
    {"code": "EGP", "name": "Egyptian Pound", "symbol": "£", "country": "Egypt"},
    {"code": "NGN", "name": "Nigerian Naira", "symbol": "₦", "country": "Nigeria"},
    {"code": "KES", "name": "Kenyan Shilling", "symbol": "KSh", "country": "Kenya"},
    {"code": "GHS", "name": "Ghanaian Cedi", "symbol": "GH₵", "country": "Ghana"},
    {"code": "MAD", "name": "Moroccan Dirham", "symbol": "د.م.", "country": "Morocco"},
    {"code": "TND", "name": "Tunisian Dinar", "symbol": "د.ت", "country": "Tunisia"},
    {"code": "ARS", "name": "Argentine Peso", "symbol": "AR$", "country": "Argentina"},
    {"code": "COP", "name": "Colombian Peso", "symbol": "COL$", "country": "Colombia"},
    {"code": "PEN", "name": "Peruvian Sol", "symbol": "S/", "country": "Peru"},
    {"code": "VND", "name": "Vietnamese Dong", "symbol": "₫", "country": "Vietnam"},
    {"code": "PKR", "name": "Pakistani Rupee", "symbol": "₨", "country": "Pakistan"},
    {"code": "BDT", "name": "Bangladeshi Taka", "symbol": "৳", "country": "Bangladesh"},
    {"code": "LKR", "name": "Sri Lankan Rupee", "symbol": "Rs", "country": "Sri Lanka"},
    {"code": "UAH", "name": "Ukrainian Hryvnia", "symbol": "₴", "country": "Ukraine"},
    {"code": "RON", "name": "Romanian Leu", "symbol": "lei", "country": "Romania"},
    {"code": "BGN", "name": "Bulgarian Lev", "symbol": "лв", "country": "Bulgaria"},
    {"code": "HRK", "name": "Croatian Kuna", "symbol": "kn", "country": "Croatia"},
    {"code": "ISK", "name": "Icelandic Króna", "symbol": "kr", "country": "Iceland"},
    {"code": "TWD", "name": "New Taiwan Dollar", "symbol": "NT$", "country": "Taiwan"},
    {"code": "JOD", "name": "Jordanian Dinar", "symbol": "د.ا", "country": "Jordan"},
    {"code": "LBP", "name": "Lebanese Pound", "symbol": "ل.ل", "country": "Lebanon"},
    {"code": "IRR", "name": "Iranian Rial", "symbol": "﷼", "country": "Iran"},
    {"code": "IQD", "name": "Iraqi Dinar", "symbol": "ع.د", "country": "Iraq"},
    {"code": "AFN", "name": "Afghan Afghani", "symbol": "؋", "country": "Afghanistan"},
    {"code": "MMK", "name": "Myanmar Kyat", "symbol": "K", "country": "Myanmar"},
    {"code": "UZS", "name": "Uzbekistani Som", "symbol": "so'm", "country": "Uzbekistan"},
    {"code": "KZT", "name": "Kazakhstani Tenge", "symbol": "₸", "country": "Kazakhstan"},
    {"code": "AZN", "name": "Azerbaijani Manat", "symbol": "₼", "country": "Azerbaijan"},
    {"code": "GEL", "name": "Georgian Lari", "symbol": "₾", "country": "Georgia"},
    {"code": "AMD", "name": "Armenian Dram", "symbol": "֏", "country": "Armenia"},
    {"code": "BYN", "name": "Belarusian Ruble", "symbol": "Br", "country": "Belarus"},
    {"code": "MDL", "name": "Moldovan Leu", "symbol": "L", "country": "Moldova"},
    {"code": "RSD", "name": "Serbian Dinar", "symbol": "дин", "country": "Serbia"},
    {"code": "MKD", "name": "Macedonian Denar", "symbol": "ден", "country": "North Macedonia"},
    {"code": "ALL", "name": "Albanian Lek", "symbol": "L", "country": "Albania"},
    {"code": "BAM", "name": "Bosnia-Herzegovina Convertible Mark", "symbol": "KM", "country": "Bosnia and Herzegovina"},
    {"code": "DZD", "name": "Algerian Dinar", "symbol": "د.ج", "country": "Algeria"},
    {"code": "LYD", "name": "Libyan Dinar", "symbol": "ل.د", "country": "Libya"},
    {"code": "SDG", "name": "Sudanese Pound", "symbol": "ج.س.", "country": "Sudan"},
    {"code": "ETB", "name": "Ethiopian Birr", "symbol": "Br", "country": "Ethiopia"},
    {"code": "TZS", "name": "Tanzanian Shilling", "symbol": "TSh", "country": "Tanzania"},
    {"code": "UGX", "name": "Ugandan Shilling", "symbol": "USh", "country": "Uganda"},
    {"code": "RWF", "name": "Rwandan Franc", "symbol": "Fr", "country": "Rwanda"},
    {"code": "ZMW", "name": "Zambian Kwacha", "symbol": "ZK", "country": "Zambia"},
    {"code": "BWP", "name": "Botswana Pula", "symbol": "P", "country": "Botswana"},
    {"code": "MUR", "name": "Mauritian Rupee", "symbol": "₨", "country": "Mauritius"},
    {"code": "SCR", "name": "Seychellois Rupee", "symbol": "₨", "country": "Seychelles"},
    {"code": "MWK", "name": "Malawian Kwacha", "symbol": "MK", "country": "Malawi"},
    {"code": "MZN", "name": "Mozambican Metical", "symbol": "MT", "country": "Mozambique"},
    {"code": "AOA", "name": "Angolan Kwanza", "symbol": "Kz", "country": "Angola"},
    {"code": "NAD", "name": "Namibian Dollar", "symbol": "N$", "country": "Namibia"},
    {"code": "SZL", "name": "Swazi Lilangeni", "symbol": "L", "country": "Eswatini"},
    {"code": "LSL", "name": "Lesotho Loti", "symbol": "L", "country": "Lesotho"},
    {"code": "MGA", "name": "Malagasy Ariary", "symbol": "Ar", "country": "Madagascar"},
    {"code": "KMF", "name": "Comorian Franc", "symbol": "Fr", "country": "Comoros"},
    {"code": "XOF", "name": "West African CFA Franc", "symbol": "Fr", "country": "West Africa"},
    {"code": "XAF", "name": "Central African CFA Franc", "symbol": "Fr", "country": "Central Africa"},
    {"code": "CDF", "name": "Congolese Franc", "symbol": "Fr", "country": "Democratic Republic of Congo"},
    {"code": "GMD", "name": "Gambian Dalasi", "symbol": "D", "country": "Gambia"},
    {"code": "GNF", "name": "Guinean Franc", "symbol": "Fr", "country": "Guinea"},
    {"code": "SLL", "name": "Sierra Leonean Leone", "symbol": "Le", "country": "Sierra Leone"},
    {"code": "LRD", "name": "Liberian Dollar", "symbol": "L$", "country": "Liberia"},
    {"code": "CVE", "name": "Cape Verdean Escudo", "symbol": "$", "country": "Cape Verde"},
    {"code": "STN", "name": "São Tomé and Príncipe Dobra", "symbol": "Db", "country": "São Tomé and Príncipe"},
    {"code": "UYU", "name": "Uruguayan Peso", "symbol": "$U", "country": "Uruguay"},
    {"code": "PYG", "name": "Paraguayan Guarani", "symbol": "₲", "country": "Paraguay"},
    {"code": "BOB", "name": "Bolivian Boliviano", "symbol": "Bs.", "country": "Bolivia"},
    {"code": "VES", "name": "Venezuelan Bolívar", "symbol": "Bs.S", "country": "Venezuela"},
    {"code": "HTG", "name": "Haitian Gourde", "symbol": "G", "country": "Haiti"},
    {"code": "JMD", "name": "Jamaican Dollar", "symbol": "J$", "country": "Jamaica"},
    {"code": "TTD", "name": "Trinidad and Tobago Dollar", "symbol": "TT$", "country": "Trinidad and Tobago"},
    {"code": "BBD", "name": "Barbadian Dollar", "symbol": "Bds$", "country": "Barbados"},
    {"code": "BSD", "name": "Bahamian Dollar", "symbol": "B$", "country": "Bahamas"},
    {"code": "BZD", "name": "Belize Dollar", "symbol": "BZ$", "country": "Belize"},
    {"code": "GTQ", "name": "Guatemalan Quetzal", "symbol": "Q", "country": "Guatemala"},
    {"code": "HNL", "name": "Honduran Lempira", "symbol": "L", "country": "Honduras"},
    {"code": "NIO", "name": "Nicaraguan Córdoba", "symbol": "C$", "country": "Nicaragua"},
    {"code": "CRC", "name": "Costa Rican Colón", "symbol": "₡", "country": "Costa Rica"},
    {"code": "PAB", "name": "Panamanian Balboa", "symbol": "B/.", "country": "Panama"},
    {"code": "DOP", "name": "Dominican Peso", "symbol": "RD$", "country": "Dominican Republic"},
    {"code": "CUP", "name": "Cuban Peso", "symbol": "₱", "country": "Cuba"},
    {"code": "SRD", "name": "Surinamese Dollar", "symbol": "Sr$", "country": "Suriname"},
    {"code": "GYD", "name": "Guyanese Dollar", "symbol": "G$", "country": "Guyana"},
    {"code": "FJD", "name": "Fijian Dollar", "symbol": "FJ$", "country": "Fiji"},
    {"code": "PGK", "name": "Papua New Guinean Kina", "symbol": "K", "country": "Papua New Guinea"},
    {"code": "SBD", "name": "Solomon Islands Dollar", "symbol": "SI$", "country": "Solomon Islands"},
    {"code": "VUV", "name": "Vanuatu Vatu", "symbol": "Vt", "country": "Vanuatu"},
    {"code": "WST", "name": "Samoan Tala", "symbol": "T", "country": "Samoa"},
    {"code": "TOP", "name": "Tongan Paʻanga", "symbol": "T$", "country": "Tonga"},
    {"code": "NPR", "name": "Nepalese Rupee", "symbol": "₨", "country": "Nepal"},
    {"code": "BTN", "name": "Bhutanese Ngultrum", "symbol": "Nu.", "country": "Bhutan"},
    {"code": "MVR", "name": "Maldivian Rufiyaa", "symbol": "Rf", "country": "Maldives"},
    {"code": "LAK", "name": "Lao Kip", "symbol": "₭", "country": "Laos"},
    {"code": "KHR", "name": "Cambodian Riel", "symbol": "៛", "country": "Cambodia"},
    {"code": "BND", "name": "Brunei Dollar", "symbol": "B$", "country": "Brunei"},
    {"code": "MNT", "name": "Mongolian Tugrik", "symbol": "₮", "country": "Mongolia"},
    {"code": "KPW", "name": "North Korean Won", "symbol": "₩", "country": "North Korea"},
    {"code": "TMT", "name": "Turkmenistani Manat", "symbol": "m", "country": "Turkmenistan"},
    {"code": "TJS", "name": "Tajikistani Somoni", "symbol": "ЅМ", "country": "Tajikistan"},
    {"code": "KGS", "name": "Kyrgyzstani Som", "symbol": "с", "country": "Kyrgyzstan"},
]


@router.get("/", response_model=ApiResponse[list[dict]])
async def get_currencies(response: Response):
    """
    Get a list of all world currencies.

    This endpoint is unauthenticated and returns a cacheable response.
    The response includes currency code, name, symbol, and country.

    Cache-Control header is set to cache for 24 hours (86400 seconds).
    """
    # Set cache headers for 24 hours
    response.headers["Cache-Control"] = "public, max-age=86400"
    response.headers["ETag"] = "currencies-v1"

    return ApiResponse(result=CURRENCIES)


@router.get("/{currency_code}", response_model=ApiResponse[dict])
async def get_currency_by_code(currency_code: str, response: Response):
    """
    Get a specific currency by its code.

    Args:
        currency_code: The 3-letter ISO currency code (e.g., USD, EUR, GBP)

    Returns:
        Currency details including code, name, symbol, and country
    """
    # Set cache headers for 24 hours
    response.headers["Cache-Control"] = "public, max-age=86400"
    response.headers["ETag"] = f"currency-{currency_code}-v1"

    currency_code_upper = currency_code.upper()
    currency = next((c for c in CURRENCIES if c["code"] == currency_code_upper), None)

    if not currency:
        return JSONResponse(
            status_code=404,
            content={"detail": f"Currency with code '{currency_code}' not found"},
        )

    return ApiResponse(result=currency)
