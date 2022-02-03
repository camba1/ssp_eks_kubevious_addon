import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';


/**
 * User provided options for the Helm Chart
 */
export interface sspKubeviousAddOnProps extends ssp.addons.HelmAddOnUserProps {
  version?: string,
  ingressEnabled?: boolean,
  kubeviousServiceType?: string,
  mysqlRootPassword?: string,
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
  values: {},

  ingressEnabled: false,
  kubeviousServiceType: "ClusterIP",
  mysqlRootPassword: "kubevious"
}

/**
 * Main class to instantiate the Helm chart
 */
export class SspKubeviousAddOn extends ssp.addons.HelmAddOn {

  readonly options: sspKubeviousAddOnProps

  constructor(props: sspKubeviousAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as sspKubeviousAddOnProps;
  }


  deploy(clusterInfo: ssp.ClusterInfo): Promise<Construct> {
    let values: ssp.Values = populateValues(this.options)
    const chart = this.addHelmChart(clusterInfo, values)
    return Promise.resolve(chart)
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: sspKubeviousAddOnProps): ssp.Values {
  const values = helmOptions.values ?? {};

  ssp.utils.setPath(values, "ingress.enabled",  helmOptions.ingressEnabled)
  ssp.utils.setPath(values, "kubevious.service.type",  helmOptions.kubeviousServiceType)
  ssp.utils.setPath(values, "mysql.root.password",  helmOptions.mysqlRootPassword)

  return values
}