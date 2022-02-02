## ssp-amazon-eks add-ons creation example



This repo shows examples on how to create add-ons for the [ssp-amazon-eks cluster creator](https://github.com/aws-quickstart/ssp-amazon-eks)

It provides instructions to  create:

- Helm chart based add-ons
- YAML manifest based add-ons

For additional details on creating and using these type of add-ons, please visit the [project extensibility page](https://aws-quickstart.github.io/ssp-amazon-eks/extensibility/)



### Create a new Helm based add-on

In this section of the workshop, we will create a new Helm based add-on that will quickly and easily deploy Kubevious Kubernetes dashboard to an EKS cluster.



##### Setup a new project

Let's create a new  project to host our add-on:

```shell
mkdir ssp_eks_kubevious_addon
cd ssp_eks_kubevious_addon
cdk init app --language typescript
```

Update the context section of the cdk.json file to allow CDK to use the new style synthesis:

```json
"@aws-cdk/core:newStyleStackSynthesis": true
```

Bootstrap environment (if it has not been strapped before):

```shell
cdk bootstrap --trust=$ACCOUNT_ID \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  aws://$ACCOUNT_ID/$AWS_REGION
```

Install ssp-eks-module

```shell
npm i @aws-quickstart/ssp-amazon-eks
```

##### Basic project setup

When CDK initialized our project it created a couple of files with a generic cdk project structure. We will be replacing the content of those files with code specific to developing an add-on.

Let's start by replacing the `bin/ssp_eks_kubevious_addon.ts` file contents with the code below. This will allow us to create an EKS cluster where we can eventually test our addon

```typescript
import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';

const app = new App();

ssp.EksBlueprint.builder()
    .addOns()
    .build(app, 'my-kubevious-addon');
```

Now, replace the content of `lib/ssp_eks_kubevious_addon.ts` with the following code to get started with our add-on creation:

```typescript
import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';

/**
 * User provided options for the Helm Chart
 */
export interface MyKubeviousAddOnProps extends ssp.addons.HelmAddOnUserProps {}

/**
 * Default props to be used when creating the Helm chart
 */
export const defaultProps: ssp.addons.HelmAddOnProps & MyKubeviousAddOnProps = {
  name: "",               // Internal identifyer for our add-on
  namespace: "",          // Namesapce used to deploy the chart
  chart: "",              // Name of the Chart to be deployed
  version: "",            // version of the chart 
  release: "",            // Name for our chart in Kubernetes
  repository:  "",        // HTTPS address of the repository that holde the chart
  cloudWatchRegion: "",   // Region to which to send CloudWatchLogs
  values: {}              // Additional chart values (empty unless user provides values) 
}

/**
 * Main class to instantiate the Helm chart
 */
export class MyKubeviousAddOn extends ssp.addons.HelmAddOn {

  readonly options: MyKubeviousAddOnProps

  constructor(props: MyKubeviousAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as MyKubeviousAddOnProps;
  }

   deploy(clusterInfo: ssp.ClusterInfo): Promise<Construct> {
     const values: ssp.Values = {};
     const chart = this.addHelmChart(clusterInfo, values);
     return Promise.resolve(chart);
   }


}
```

This is the basic structure for a Helm based add-on. It contains:

- `MyKubeviousAddOn class` : Main logic structure for the add-on
    - The `deploy` method calls this.addHelchart which is in charge of fetching the chart from the appropriate Helm repo and applying user provided Helm overrides values
- `MyKubeviousAddOnProps`: User provided values for the Helm chart
- `defaultProps:` Combination of the mandatory values and the user provided Helm chart values to be applied to the chart



##### Add mandatory options for the Helm chart

In the lib/ssp_eks_kubevious_addon.js, let's replace the empty values with values that reflect the Helm chart we want to deploy as part of the add-on:

```typescript
export const defaultProps: ssp.addons.HelmAddOnProps & sspKubeviousAddOnProps = {
  name: "ssp-kubevious-addon",
  namespace: "kubevious",
  chart: "kubevious",
  version: "0.8.15",
  release: "kubevious",
  repository:  "https://helm.kubevious.io",

  cloudWatchRegion: "us-east-2",
  values: {}

}
```



This is enough information for us to deploy the add-on to our cluster. However, before we do that, let's allow the users of our add-on the ability to customize the chart with some commonly used options.

Let's start by adding the new options in the `sspKubeviousAddOnProps` interface

```typescript
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
```



To simplify the manipulation of these optional values, let's also add so default values for our user provided values in the defaultProps:

```typescript
export const defaultProps: ssp.addons.HelmAddOnProps & sspKubeviousAddOnProps = {
  name: "ssp-kubevious-addon",
  namespace: "kubevious",
  chart: "kubevious",
  version: "0.8.15",
  release: "kubevious",
  repository:  "https://helm.kubevious.io",
  cloudWatchRegion: "us-east-2",
  values: {},
  
  // Start new code
  ingress_enabled: false,
  kubevious_service_type: "ClusterIP",
  mysql_root_password: "kubevious"
  // End new code
}
```



For Helm to use our new values, we need to put the in the appropriate format. To do the formatting, a new populateValues function is added to the code



```typescript
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
  };
}
```



Finally, the new function is called from the main `sspKubeviousAddOn` class:

```typescript
export class sspKubeviousAddOn extends ssp.addons.HelmAddOn {

  readonly options: sspKubeviousAddOnProps

  constructor(props: sspKubeviousAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as sspKubeviousAddOnProps;
  }

  deploy(clusterInfo: ssp.ClusterInfo): Promise<Construct> {
    let values: ssp.Values = populateValues(this.options);       // Updated
    const chart = this.addHelmChart(clusterInfo, values);
    return Promise.resolve(chart);
  }

}
```



After all the modifications, our `lib/ssp_eks_kubevious_addon.js` file should like this:



```typescript
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
```



##### Deploying the Add-on



To test that our add-on can be deployed properly, let update the `bin/ssp_eks_kubevious_addon.ts` to have a  reference to our add-on



```typescript
import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { sspKubeviousAddOn } from '../lib/ssp_eks_kubevious_addon-stack'   // Add

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new sspKubeviousAddOn({                                       // Update
        kubevious_service_type: 'NodePort',
		}))
    .build(app, 'my-kubevious-addon');

```



Now, before we deploy, let's make validate that we did not make any errors by running:

``` shell
 cdk list
```

This should return the following:

```shell
my-kubevious-addon
```

Finally, we can create our cluster with the new add-on:

```shell
cdk deploy
```

This command may take several minutes to run since it is creating a new EKS cluster for us. When the command is complete, it output a set of commands similar to the ones listed below:

```shell
my-kubevious-addon.mykubeviousaddonClusterName<randomValue> = my-kubevious-addon

my-kubevious-addon.mykubeviousaddonConfigCommand<randomValue> = aws eks update-kubeconfig --name my-kubevious-addon --region <your-region> --role-arn <your-role>

my-kubevious-addon.mykubeviousaddonGetTokenCommand<randomValue> = aws eks get-token --cluster-name my-kubevious-addon --region <your-region> --role-arn <your-role>

```



To access the cluster, we need to update your Kubernetes config file using the mykubeviousaddonConfigCommand<randomValue> that we got from the output above



``` shell
aws eks update-kubeconfig --name my-kubevious-addon --region <your-region> --role-arn <your-role>
```

Finally, we can see our add-on in action by running the command below

```shell
kubectl port-forward $(kubectl get pods -n kubevious -l "app.kubernetes.io/component=kubevious-ui" -o jsonpath="{.items[0].metadata.name}") 8080:80 -n kubevious  
```

and navigating to http://localhost:8080



### Create a new YAML manifest based add-on

In this section, we will create a YAML manifest add-on to easily deploy an ingressClass to the cluster. Ingress classes interact with items like the Application Load Balancer to allow external access to the services in the cluster via an Ingress.



While creating a new Add-on should always be done on its own repo, we will leverage the repo that we created in the previous section to develop the YAML manifest add-on so that we do not have to wait for a new cluster to spin up.



##### Basic add-on setup

We will start by creating a new file called `ssp_eks_ingressClass_addon-stack.ts` in the `lib` folder and adding the basic structure for this type of add-on



```typescript
import { ClusterAddOn, ClusterInfo } from "@aws-quickstart/ssp-amazon-eks";
import { loadYaml } from "@aws-quickstart/ssp-amazon-eks/dist/utils";
import { KubernetesManifest } from "@aws-cdk/aws-eks";

/**
 * User provided overrides for the K8s Manifest
 */
export interface sspIngressClassProps {
}

/**
 * Default values for the K8s manifest
 */
const defaultProps: sspIngressClassProps = {
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

        new KubernetesManifest(cluster.stack, 'sspIngressClassManifest', {
            cluster: cluster,
            manifest: <your manifest>,
            overwrite: true
        })
    }
}

```

Similar to the Helm add-on, this basic structure  has the following components:

- `sspIngressClassAddOn class` : Main logic structure for the add-on
    - The `deploy` method calls `KubernetesManifest` which is in charge of deploying the manifest to the cluster
- `sspIngressClassProps:` Optional user provided values to update the manifest
- `defaultProps`: Contains the default values required to deploy the manifest



##### Defining the Props

The next step is to decide which values we will allow the user of our add-on to customize. In our case, users can provide: name, labels, annotation, controller type and whether the ingressClass will be the default for the cluster



```typescript
/**
 * User provided overrides for the Manifest
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
```



##### Load the raw YAML manifest and update the values

To load and manipulate the YAML manifest of the resource we want to create, we will create two functions:

```typescript
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
```

- `getYaml` returns the raw YAML needed to create our resource. Note that in this case we are using an inline string, but from more complex scenarios, it may be useful to load a separate file containing the required YAML.
- `updateYAML` Takes the record representation of a YAML manifest and updates it with all the required and user provides values.



Finally, we will update the `sspIngressClassAddOn` class to call our new function and deploy our new add-on



```typescript
/**
 * Main class to instantiate the Kubernetes resource
 */
export class sspIngressClassAddOn implements ClusterAddOn {

    readonly options: sspIngressClassProps

    constructor(props: sspIngressClassProps) {
        this.options = {...defaultProps, ...props} as sspIngressClassProps;
    }

    deploy(clusterInfo: ClusterInfo): void {

      // New Code
      
        const cluster = clusterInfo.cluster;
        const ingressClassRawYaml: string = getYaml();
        const ingressClassManifest: Record<string, any>[] = [ loadYaml(ingressClassRawYaml) ]
        const UpdatedIngressClassManifest: Record<string, any>[] = updateYaml(ingressClassManifest, this.options)

        // End New code
        
        new KubernetesManifest(cluster.stack, 'sspIngressClassManifest', {
            cluster: cluster,
            manifest: UpdatedIngressClassManifest,                            // Update
            overwrite: true
        })
    }
}
```



##### Deploying the Add-on



Now let's go back to the `bin/ssp_eks_kubevious_addon.ts` and reference our IngressClass add-on



```typescript
import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { sspKubeviousAddOn } from '../lib/ssp_eks_kubevious_addon-stack'
import { sspKubeviousAddOn2 } from '../lib/ssp_eks_kubevious_addon-stack'
import { sspIngressClassAddOn } from '../lib/ssp_eks_ingressClass_addon-stack'

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new sspKubeviousAddOn({
        kubevious_service_type: 'NodePort',
    }))
    .addOns(new sspIngressClassAddOn({
  			annotations: { "test": "test"}, labels: { "test2": "test2"}
     }))
    .build(app, 'my-kubevious-addon');

```



Now, before we deploy, let make validate  that we did not make any errors by running:

``` shell
 cdk list
```

This should return the following assuming processed properly:

```shell
my-kubevious-addon
```



Next, let's update our cluster with the new add-on:

```shell
cdk deploy
```



And finally you can see our Add-on in action by:

```shell
kubectl get ingressClass
```

The result of the above command should display our IngressClass running in the cluster