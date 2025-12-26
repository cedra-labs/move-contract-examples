/** Version of the feature. */
type AptosOpenInMobileAppVersion = '1.0.0';
/** Name of the feature. */
declare const AptosOpenInMobileAppNamespace = "aptos:openInMobileApp";
type AptosOpenInMobileAppFeature = {
    /** Namespace for the feature. */
    [AptosOpenInMobileAppNamespace]: {
        /** Version of the feature API. */
        version: AptosOpenInMobileAppVersion;
        openInMobileApp: AptosOpenInMobileAppMethod;
    };
};
type AptosOpenInMobileAppMethod = () => void;

export { AptosOpenInMobileAppFeature, AptosOpenInMobileAppMethod, AptosOpenInMobileAppNamespace, AptosOpenInMobileAppVersion };
