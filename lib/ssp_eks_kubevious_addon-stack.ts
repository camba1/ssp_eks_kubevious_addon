import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';


/**
 * User provided options for the Helm Chart
 */
export interface sspKubeviousAddOnProps extends ssp.addons.HelmAddOnUserProps {
  /**
   * Cloudwatch region where logs are forwarded
   */
  cloudWatchRegion?: string,
  version?: string,
  ingress_enabled?: boolean,
  kubevious_service_type?: string,
  mysql_root_password?: string,

}

/**
 * Default props to be used when creating the Helm chart
 */
export const defaultProps: ssp.addons.HelmAddOnProps & sspKubeviousAddOnProps = {
  name: "ssp-kubevious-addon",
  namespace: "kubevious",
  chart: "kubevious",
  version: "0.8.15",
  release: "kubevious",
  repository:  "https://helm.kubevious.io",
  cloudWatchRegion: "us-east-2",
  values: {},

  ingress_enabled: false,
  kubevious_service_type: "ClusterIP",
  mysql_root_password: "kubevious"
}

/**
 * Main class to instantiate the Helm chart
 */
export class sspKubeviousAddOn extends ssp.addons.HelmAddOn {

  readonly options: sspKubeviousAddOnProps

  constructor(props: sspKubeviousAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as sspKubeviousAddOnProps;
  }


  deploy(clusterInfo: ssp.ClusterInfo): Promise<Construct> {
    let values: ssp.Values = populateValues(this.options);
    const chart = this.addHelmChart(clusterInfo, values);
    return Promise.resolve(chart);
  }

}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: sspKubeviousAddOnProps): ssp.Values {
  return {
    ingress: {
      enabled:  helmOptions.ingress_enabled
    },
    kubevious: {
      service: {
        type: helmOptions.kubevious_service_type
      }
    },
    mysql: {
      root: {
        password: helmOptions.mysql_root_password
      }
    }
  }
}