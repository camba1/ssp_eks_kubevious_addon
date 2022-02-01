import { ClusterAddOn, ClusterInfo } from "@aws-quickstart/ssp-amazon-eks";
import { loadYaml } from "@aws-quickstart/ssp-amazon-eks/dist/utils";
import { KubernetesManifest } from "@aws-cdk/aws-eks";

/**
 * User provided overrides for the K8s Manifest
 */
export interface sspIngressClassProps {
    name?: string,
    labels?: { [name: string]: string };
    annotations?: { [name: string]: string };
    controller?: string;
    defaultController?: boolean;

}

/**
 * Default values for the K8s manifest
 */
const defaultProps: sspIngressClassProps = {
    name: "alb",
    controller: "ingress.k8s.aws/alb",
    defaultController: false
}

/**
 * Main class to instantiate the Kubernetes resource
 */
export class sspIngressClassAddOn implements ClusterAddOn {

    readonly options: sspIngressClassProps

    constructor(props: sspIngressClassProps) {
        this.options = {...defaultProps, ...props} as sspIngressClassProps;
    }

    deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster;
        const ingressClassRawYaml: string = getYaml();
        const ingressClassManifest: Record<string, any>[] = [ loadYaml(ingressClassRawYaml) ]
        const UpdatedIngressClassManifest: Record<string, any>[] = updateYaml(ingressClassManifest, this.options)

        new KubernetesManifest(cluster.stack, 'sspIngressClassManifest', {
            cluster: cluster,
            manifest: UpdatedIngressClassManifest,
            overwrite: true
        })
    }
}

/**
 * Function return the YAML manifest to be manipulated and deployed
 */
function getYaml(): string {
    return  `
    apiVersion: networking.k8s.io/v1
    kind: IngressClass
    metadata:
      name: 
    spec:
      controller: 
    `
}

/** Update YAML manifest wiht correct option values
 *
 * @param ingressClassManifest Record representation of a valid YAML manifest
 * @param YamlOptions Options used to update the appropriate values in the YAML manifest
 */
function updateYaml(ingressClassManifest: Record<string, any>[], YamlOptions: sspIngressClassProps): Record<string, any>[] {

    ingressClassManifest[0].metadata.name = YamlOptions.name
    ingressClassManifest[0].spec.controller = YamlOptions.controller
    ingressClassManifest[0].metadata.labels = YamlOptions.labels
    let annotations: { [name: string]: string } = YamlOptions.annotations? YamlOptions.annotations: {}
    if (YamlOptions.defaultController) {
        annotations = { ...annotations, 'ingressclass.kubernetes.io/is-default-class' : "true"}
    }
    ingressClassManifest[0].metadata.annotations = annotations
    return ingressClassManifest
}